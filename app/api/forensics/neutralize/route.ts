import { NextRequest, NextResponse } from "next/server";
import {
  traceThreatOrigin,
  immunizeNetwork,
  generateAbuseReport,
} from "@/lib/threat-neutralizer";
import { withApiGuard, sanitizeString } from "@/lib/api-guard";
import { checkRateLimit } from "@/lib/telemetry";

export interface NeutralizeRequest {
  target: string;
  threatType?: string;
  threatVerdict?: "fraud" | "suspicious" | "genuine";
  threatDetails?: {
    flags?: string[];
    confidence?: number;
  };
}

export const POST = withApiGuard<NeutralizeRequest>(
  async (req: NextRequest, body: NeutralizeRequest, clientIp: string) => {
    // 1. Rate limiter (60 neutralization requests / min per IP)
    const rateLimit = checkRateLimit(`neutralize:${clientIp}`, 60, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit reached",
          code: "TOO_MANY_REQUESTS",
          details: `Please wait ${rateLimit.resetInSeconds} seconds before requesting further threat neutralizations.`,
        },
        { status: 429 }
      );
    }

    const { target, threatType = "unknown", threatDetails = {} } = body;
    const cleanTarget = sanitizeString(target || "");

    if (!cleanTarget) {
      return NextResponse.json(
        {
          error: "Target identifier missing",
          code: "INVALID_TARGET",
          details: "A valid URL, QR text, UPI ID, or file hash is required for origin tracing.",
        },
        { status: 400 }
      );
    }

    // 1. Trace Origin Infrastructure
    const origin = await traceThreatOrigin(cleanTarget);

    // 2. Immunize Network In-Memory
    const immunizationResult = await immunizeNetwork(
      cleanTarget,
      threatType,
      origin
    );

    // 3. Generate Formal Abuse Takedown Report
    const abuseReport = generateAbuseReport(origin, threatDetails);

    return NextResponse.json(
      {
        success: true,
        origin,
        immunization: {
          record: immunizationResult.record,
          isNewlyAdded: immunizationResult.isNewlyAdded,
          totalNetworkProtected: immunizationResult.totalNetworkProtected,
        },
        abuseReport,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
);
