/**
 * SatyaKavach Threat Telemetry & Sliding-Window Rate Limiter
 * Tracks in-memory forensic operations and guards against pipeline abuse
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface ThreatStats {
  totalScans: number;
  activeThreatCount: number;
  verdicts: {
    genuine: number;
    suspicious: number;
    fraud: number;
  };
  modules: {
    upi: number;
    qr: number;
    job: number;
    deepfake: number;
    document: number;
  };
  averageLatencyMs: number;
  lastUpdated: string;
}

// Global in-memory storage (persists across requests and route bundles within the Node process)
interface GlobalTelemetryStore {
  rateLimitMap: Map<string, RateLimitBucket>;
  scanHistory: Array<{
    module: string;
    verdict: "genuine" | "suspicious" | "fraud";
    riskScore: number;
    latencyMs: number;
    timestamp: number;
  }>;
  countsByVerdict: {
    genuine: number;
    suspicious: number;
    fraud: number;
  };
  countsByModule: {
    upi: number;
    qr: number;
    job: number;
    deepfake: number;
    document: number;
  };
  totalLatencyAccumulator: number;
}

const globalForTelemetry = globalThis as unknown as {
  __satyaKavachTelemetry?: GlobalTelemetryStore;
};

if (!globalForTelemetry.__satyaKavachTelemetry) {
  globalForTelemetry.__satyaKavachTelemetry = {
    rateLimitMap: new Map(),
    scanHistory: [],
    countsByVerdict: { genuine: 0, suspicious: 0, fraud: 0 },
    countsByModule: { upi: 0, qr: 0, job: 0, deepfake: 0, document: 0 },
    totalLatencyAccumulator: 0,
  };
}

const telemetryStore = globalForTelemetry.__satyaKavachTelemetry;
const rateLimitMap = telemetryStore.rateLimitMap;
const scanHistory = telemetryStore.scanHistory;
const countsByVerdict = telemetryStore.countsByVerdict;
const countsByModule = telemetryStore.countsByModule;


/**
 * Sliding-Window In-Memory Rate Limiter
 * @param key Identifier (e.g. Client IP + route)
 * @param maxRequests Maximum allowable requests within the window
 * @param windowMs Window duration in milliseconds (default: 60s)
 */
export function checkRateLimit(
  key: string,
  maxRequests = 30,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(key);

  // Periodic cleanup of expired rate limit keys
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetAt < now) rateLimitMap.delete(k);
    }
  }

  if (!bucket || bucket.resetAt < now) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (bucket.count >= maxRequests) {
    const resetInSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(1, resetInSeconds),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: maxRequests - bucket.count,
    resetInSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

/**
 * Records a completed forensic scan into the in-memory telemetry store
 */
export function recordTelemetry(
  module: "upi" | "qr" | "job" | "deepfake" | "document",
  verdict: "genuine" | "suspicious" | "fraud",
  riskScore: number,
  latencyMs: number
) {
  const now = Date.now();

  // Update counters
  if (countsByVerdict[verdict] !== undefined) {
    countsByVerdict[verdict]++;
  }
  if (countsByModule[module] !== undefined) {
    countsByModule[module]++;
  }
  telemetryStore.totalLatencyAccumulator += latencyMs;

  scanHistory.push({
    module,
    verdict,
    riskScore,
    latencyMs,
    timestamp: now,
  });

  // Keep last 1,000 scan events in ring buffer
  if (scanHistory.length > 1000) {
    scanHistory.shift();
  }
}

/**
 * Retrieves aggregate threat telemetry stats
 */
export function getThreatTelemetryStats(): ThreatStats {
  const totalScans =
    countsByVerdict.genuine + countsByVerdict.suspicious + countsByVerdict.fraud;
  const avgLatency =
    totalScans > 0 ? Math.round(telemetryStore.totalLatencyAccumulator / totalScans) : 0;

  return {
    totalScans,
    activeThreatCount: countsByVerdict.fraud + countsByVerdict.suspicious,
    verdicts: { ...countsByVerdict },
    modules: { ...countsByModule },
    averageLatencyMs: avgLatency,
    lastUpdated: new Date().toISOString(),
  };
}
