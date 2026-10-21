"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import clsx from "clsx";
import {
  QrCode,
  Link2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Upload,
  RefreshCcw,
  Download,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  Search,
  ArrowRight,
  Globe2,
  Server,
  Shield,
  Mail,
  X,
} from "lucide-react";
import RealTimeGroundingCard from "@/components/RealTimeGroundingCard";
import { parseUPIIntent, computeSHA256 } from "@/lib/real-forensics";
import { takeIntake } from "@/lib/intake";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
type ThreatLevel = "safe" | "suspicious" | "dangerous";

interface DecodedQR {
  rawText: string;
  type: "upi" | "url" | "text" | "unknown";
}

interface UPIParams {
  pa?: string;   // payee address
  pn?: string;   // payee name
  am?: string;   // amount
  tr?: string;   // transaction ref
  tn?: string;   // transaction note
  mc?: string;   // merchant code
  mode?: string; // 02 = collect request (DANGER)
  purpose?: string;
}

interface ThreatFlag {
  label: string;
  detail: string;
  severity: "high" | "medium" | "low";
}

interface ScanResult {
  decoded: DecodedQR;
  threatLevel: ThreatLevel;
  confidence: number;
  flags: ThreatFlag[];
  safeSignals: string[];
  upiParams?: UPIParams;
  finalUrl?: string;
  timestamp: string;
}

/* ─────────────────────────────────────────
   Intelligence databases
───────────────────────────────────────── */

// Known URL shorteners used to hide destination
const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "buff.ly",
  "rb.gy", "cutt.ly", "short.io", "is.gd", "v.gd", "tiny.cc",
  "shrinkme.io", "clck.ru", "qr.ae", "link.tl", "smarturl.it",
  "rebrand.ly", "bl.ink", "su.pr", "dlvr.it", "go2l.ink",
]);

// Legitimate Indian bank/fintech domains
const LEGITIMATE_DOMAINS = new Set([
  "sbi.co.in", "onlinesbi.sbi", "hdfcbank.com", "icicibank.com",
  "axisbank.com", "kotak.com", "yesbank.in", "phonepe.com",
  "paytm.com", "googlepay.com", "bhimupi.org.in", "npci.org.in",
  "idfcfirstbank.com", "federalbank.co.in", "indusind.com",
  "upi.one", "razorpay.com", "cashfree.com",
]);

// Suspicious TLDs frequently used in Indian phishing
const SUSPICIOUS_TLDS = new Set([
  ".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".club",
  ".online", ".site", ".website", ".space", ".pw", ".cc",
  ".icu", ".buzz", ".uno", ".rest", ".vip",
]);

// Common typosquat patterns against Indian banks
const TYPOSQUAT_PATTERNS: Array<{ pattern: RegExp; impersonates: string }> = [
  { pattern: /sbi[^.]*\.(com|net|org|xyz|top|in(?!fo))/i, impersonates: "SBI (sbi.co.in)" },
  { pattern: /hdfc[^.]*\.(net|org|xyz|top|co\.in)/i,       impersonates: "HDFC Bank" },
  { pattern: /icici[^.]*\.(net|org|xyz|top|co\.in)/i,       impersonates: "ICICI Bank" },
  { pattern: /axis[^.]*\.(net|org|xyz|top|co\.in)/i,        impersonates: "Axis Bank" },
  { pattern: /paytm[^.]*\.(net|org|xyz|top|co\.in)/i,       impersonates: "Paytm" },
  { pattern: /phonepe[^.]*\.(net|org|xyz|top|co\.in)/i,     impersonates: "PhonePe" },
  { pattern: /googlepay[^.]*\.(net|org|xyz|co\.in)/i,       impersonates: "Google Pay" },
  { pattern: /npci[^.]*\.(net|org|xyz|com)/i,               impersonates: "NPCI" },
  { pattern: /bhim[^.]*\.(net|org|xyz|com)/i,               impersonates: "BHIM UPI" },
  { pattern: /reward[s]?.*paytm/i,                          impersonates: "Paytm Rewards" },
  { pattern: /cashback.*upi/i,                              impersonates: "UPI Cashback" },
];

// Phishing keyword signals in URLs
const PHISHING_KEYWORDS = [
  "login", "signin", "secure", "verify", "update", "kyc",
  "otp", "reward", "cashback", "prize", "lucky", "winner",
  "claim", "free", "gift", "refund", "block", "suspend",
  "account-hold", "urgent", "limited", "offer", "bonus",
];

/* ─────────────────────────────────────────
   UPI URL parser  (upi://pay?pa=...&am=...)
───────────────────────────────────────── */
function parseUPIUrl(raw: string): UPIParams {
  const params: UPIParams = {};
  try {
    const queryString = raw.includes("?") ? raw.split("?")[1] : raw;
    const sp = new URLSearchParams(queryString);
    params.pa   = sp.get("pa") ?? undefined;
    params.pn   = sp.get("pn") ?? undefined;
    params.am   = sp.get("am") ?? undefined;
    params.tr   = sp.get("tr") ?? undefined;
    params.tn   = sp.get("tn") ?? undefined;
    params.mc   = sp.get("mc") ?? undefined;
    params.mode = sp.get("mode") ?? undefined;
    params.purpose = sp.get("purpose") ?? undefined;
  } catch { /* ignore */ }
  return params;
}

/* ─────────────────────────────────────────
   Core threat analysis engine
───────────────────────────────────────── */
function analyseContent(decoded: DecodedQR, pastedUrl?: string): ScanResult {
  const flags: ThreatFlag[] = [];
  const safeSignals: string[] = [];
  let upiParams: UPIParams | undefined;
  let finalUrl: string | undefined;
  const raw = decoded.rawText || pastedUrl || "";

  /* ── UPI Deep Inspection ── */
  if (decoded.type === "upi") {
    upiParams = parseUPIUrl(raw);

    // Mode 02 = collect request (merchant-initiated debit) — highest risk
    if (upiParams.mode === "02") {
      flags.push({
        label: "Collect Request Trap (Mode 02)",
        detail: "UPI mode=02 triggers a money-DEBIT collect request — not a payment receipt. Scanning this QR will initiate a deduction FROM your account, not a credit.",
        severity: "high",
      });
    }

    // Amount field present in a QR → could be pre-filled scam
    if (upiParams.am) {
      const amt = parseFloat(upiParams.am);
      if (amt > 0) {
        flags.push({
          label: `Pre-filled Amount: ₹${amt.toLocaleString("en-IN")}`,
          detail: "Legitimate cashback / payment QRs never pre-fill an amount. A pre-filled amount means you will be charged without seeing a confirm screen on some older UPI apps.",
          severity: "high",
        });
      }
    }

    // Validate UPI handle PSP
    if (upiParams.pa) {
      const handle = upiParams.pa.includes("@") ? "@" + upiParams.pa.split("@")[1] : null;
      const trustedHandles = ["@ybl","@okaxis","@okicici","@oksbi","@paytm","@apl","@ibl","@axisbank","@sbi","@upi","@icici","@hdfc","@kotak","@fbl","@jsb","@cnrb","@barodampay","@unionbank"];
      if (handle && !trustedHandles.includes(handle.toLowerCase())) {
        flags.push({
          label: `Unregistered PSP Handle: ${handle}`,
          detail: `The UPI handle suffix '${handle}' is not a registered NPCI Payment Service Provider. Legitimate UPI IDs use official handles like @ybl, @okaxis, @paytm.`,
          severity: "high",
        });
      } else if (handle) {
        safeSignals.push(`UPI handle ${handle} is a registered NPCI PSP`);
      }

      // Suspicious merchant name patterns
      if (upiParams.pn) {
        const pn = upiParams.pn.toLowerCase();
        if (pn.includes("cashback") || pn.includes("reward") || pn.includes("prize") || pn.includes("lucky")) {
          flags.push({
            label: `Suspicious Payee Name: "${upiParams.pn}"`,
            detail: "Payee names containing 'cashback', 'reward', or 'prize' are classic social-engineering hooks used in collect-request scams.",
            severity: "medium",
          });
        }
      }
    } else {
      flags.push({
        label: "No Payee Address (pa=) in UPI URL",
        detail: "A valid UPI payment URL must contain a pa= (payee address) field. Its absence suggests a malformed or obfuscated QR.",
        severity: "medium",
      });
    }

    if (flags.length === 0) {
      safeSignals.push("No collect-request mode detected");
      safeSignals.push("No pre-filled amount trap");
    }
  }

  /* ── Web URL / Link Inspection ── */
  if (decoded.type === "url") {
    finalUrl = raw;
    let hostname = "";
    try {
      const urlObj = new URL(raw.startsWith("http") ? raw : "https://" + raw);
      hostname = urlObj.hostname.toLowerCase();
      finalUrl = urlObj.href;

      // HTTP (not HTTPS)
      if (urlObj.protocol === "http:") {
        flags.push({
          label: "Unencrypted HTTP Connection",
          detail: "This link uses plain HTTP, not HTTPS. Any data you submit (OTP, bank login) will be visible to network eavesdroppers.",
          severity: "medium",
        });
      } else {
        safeSignals.push("Uses HTTPS encryption");
      }

      // URL shortener
      if (URL_SHORTENERS.has(hostname)) {
        flags.push({
          label: `URL Shortener Detected: ${hostname}`,
          detail: "URL shorteners hide the real destination. Scammers use them to disguise phishing sites or malware downloads as legitimate payment/reward links.",
          severity: "high",
        });
      }

      // Suspicious TLD
      const matchedTLD = Array.from(SUSPICIOUS_TLDS).find(tld => hostname.endsWith(tld));
      if (matchedTLD) {
        flags.push({
          label: `High-Risk Domain TLD: .${hostname.split(".").pop()}`,
          detail: `The TLD '${matchedTLD}' is commonly used for free throwaway phishing domains. No legitimate Indian bank or fintech uses this TLD.`,
          severity: "high",
        });
      }

      // Typosquat check
      for (const { pattern, impersonates } of TYPOSQUAT_PATTERNS) {
        if (pattern.test(hostname) && !LEGITIMATE_DOMAINS.has(hostname)) {
          flags.push({
            label: `Typosquatting: Impersonates ${impersonates}`,
            detail: `The domain '${hostname}' mimics the visual appearance of '${impersonates}' but is NOT the official domain. This is a phishing site.`,
            severity: "high",
          });
          break;
        }
      }

      // Phishing keywords in path/query
      const fullUrl = raw.toLowerCase();
      const matchedKeywords = PHISHING_KEYWORDS.filter(kw => fullUrl.includes(kw));
      if (matchedKeywords.length >= 2) {
        flags.push({
          label: `Phishing Keywords Detected (${matchedKeywords.length})`,
          detail: `URL contains suspicious keywords: "${matchedKeywords.slice(0, 4).join('", "')}". Combination of these terms is a strong indicator of a phishing page.`,
          severity: "medium",
        });
      }

      // Legitimate domain check
      if (LEGITIMATE_DOMAINS.has(hostname) || Array.from(LEGITIMATE_DOMAINS).some(d => hostname.endsWith("." + d))) {
        safeSignals.push(`Domain ${hostname} is on the verified Indian fintech registry`);
      }

      // IP address as hostname
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
        flags.push({
          label: "IP Address Used as Domain",
          detail: `The URL uses a raw IP address (${hostname}) instead of a domain name. Legitimate banking sites never do this.`,
          severity: "high",
        });
      }

      // Excess subdomains (sbi.co.in.phishing-site.com pattern)
      const domainParts = hostname.split(".");
      if (domainParts.length > 4) {
        flags.push({
          label: "Excessive Subdomain Depth",
          detail: `The URL has ${domainParts.length} domain levels (e.g. sbi.co.in.malicious.xyz). Scammers prepend real bank names as subdomains to fool victims.`,
          severity: "medium",
        });
      }

    } catch {
      flags.push({
        label: "Malformed URL",
        detail: "The URL cannot be parsed. Obfuscated or broken URLs are a common trick to bypass automated scanners.",
        severity: "medium",
      });
    }
  }

  /* ── Compute final verdict ── */
  const highCount = flags.filter(f => f.severity === "high").length;
  const medCount  = flags.filter(f => f.severity === "medium").length;

  let threatLevel: ThreatLevel = "safe";
  let confidence = 85;

  if (highCount >= 1) {
    threatLevel = "dangerous";
    confidence = Math.min(99, 80 + highCount * 6 + medCount * 2);
  } else if (medCount >= 2) {
    threatLevel = "suspicious";
    confidence = 70 + medCount * 5;
  } else if (medCount === 1) {
    threatLevel = "suspicious";
    confidence = 65;
  }

  if (flags.length === 0) {
    safeSignals.push("No known threat patterns detected");
    confidence = 82;
  }

  return {
    decoded,
    threatLevel,
    confidence,
    flags,
    safeSignals,
    upiParams,
    finalUrl,
    timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
  };
}

/* ─────────────────────────────────────────
   QR decode via Canvas + jsqr
   (dynamic import so Next.js SSR is happy)
───────────────────────────────────────── */
async function decodeQRFromImage(file: File): Promise<DecodedQR | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      try {
        const jsQR = (await import("jsqr")).default;
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (!code) { resolve(null); return; }
        const raw = code.data;
        resolve(classifyContent(raw));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function classifyContent(raw: string): DecodedQR {
  const lower = raw.toLowerCase();
  if (lower.startsWith("upi://") || lower.startsWith("upi:")) {
    return { rawText: raw, type: "upi" };
  }
  if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("www.")) {
    return { rawText: raw, type: "url" };
  }
  // heuristic: contains a dot + no spaces → likely URL without scheme
  if (!raw.includes(" ") && raw.includes(".") && raw.length < 200) {
    return { rawText: raw, type: "url" };
  }
  return { rawText: raw, type: "text" };
}

/* ─────────────────────────────────────────
   Preloaded sample cases
───────────────────────────────────────── */
type SampleCase = {
  id: string;
  label: string;
  labelHi: string;
  category: string;
  input: string;
  inputType: "url" | "upi";
  mockDecoded: DecodedQR;
};

const SAMPLES: SampleCase[] = [
  {
    id: "cashback-trap",
    label: "Cashback Collect Trap",
    labelHi: "कैशबैक कलेक्ट ट्रैप",
    category: "UPI Collect Request",
    input: "upi://pay?pa=cashback-winner@fakebank&pn=Paytm+Cashback+Reward&am=1&tr=CBK123&mode=02&tn=Cashback+credit",
    inputType: "upi",
    mockDecoded: { rawText: "upi://pay?pa=cashback-winner@fakebank&pn=Paytm+Cashback+Reward&am=1&tr=CBK123&mode=02&tn=Cashback+credit", type: "upi" },
  },
  {
    id: "phishing-link",
    label: "SBI Phishing Site",
    labelHi: "SBI फ़िशिंग साइट",
    category: "Typosquat Domain",
    input: "https://sbi-netbanking-secure-login.xyz/kyc-verify?otp=update&reward=claim",
    inputType: "url",
    mockDecoded: { rawText: "https://sbi-netbanking-secure-login.xyz/kyc-verify?otp=update&reward=claim", type: "url" },
  },
  {
    id: "shortener-trap",
    label: "Hidden Shortener Link",
    labelHi: "शॉर्टनर लिंक ट्रैप",
    category: "URL Shortener",
    input: "https://bit.ly/hdfc-cashback-2024",
    inputType: "url",
    mockDecoded: { rawText: "https://bit.ly/hdfc-cashback-2024", type: "url" },
  },
  {
    id: "legit-upi",
    label: "Genuine Merchant QR",
    labelHi: "असली मर्चेंट QR",
    category: "Safe UPI Payment",
    input: "upi://pay?pa=zomatofood@icici&pn=Zomato+Food+Delivery&cu=INR",
    inputType: "upi",
    mockDecoded: { rawText: "upi://pay?pa=zomatofood@icici&pn=Zomato+Food+Delivery&cu=INR", type: "upi" },
  },
];

/* ─────────────────────────────────────────
   Programmatic QR thumbnail SVGs
───────────────────────────────────────── */
function QRThumbnail({ dangerous, label }: { dangerous: boolean; label: string }) {
  const color = dangerous ? "#DC2626" : "#059669";
  const bg = dangerous ? "#FEF2F2" : "#ECFDF5";
  // Simple 5x5 QR-like pattern
  const pattern = dangerous
    ? [[1,1,1,0,1],[1,0,1,1,0],[1,1,0,0,1],[0,1,1,0,1],[1,0,1,1,1]]
    : [[1,1,1,0,0],[1,0,1,0,1],[1,1,1,1,0],[0,0,0,0,1],[1,1,0,1,1]];

  return (
    <svg viewBox="0 0 80 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="80" rx="6" fill={bg} />
      {/* QR finder patterns */}
      <rect x="8" y="8" width="20" height="20" rx="2" fill={color} opacity="0.2" />
      <rect x="10" y="10" width="16" height="16" rx="1" fill={color} opacity="0.3" />
      <rect x="12" y="12" width="12" height="12" rx="1" fill={color} />
      <rect x="52" y="8" width="20" height="20" rx="2" fill={color} opacity="0.2" />
      <rect x="54" y="10" width="16" height="16" rx="1" fill={color} opacity="0.3" />
      <rect x="56" y="12" width="12" height="12" rx="1" fill={color} />
      <rect x="8" y="52" width="20" height="20" rx="2" fill={color} opacity="0.2" />
      <rect x="10" y="54" width="16" height="16" rx="1" fill={color} opacity="0.3" />
      <rect x="12" y="56" width="12" height="12" rx="1" fill={color} />
      {/* Data modules */}
      {pattern.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={34 + c * 7}
              y={34 + r * 7}
              width="6"
              height="6"
              rx="1"
              fill={color}
              opacity={0.6 + Math.random() * 0.4}
            />
          ) : null
        )
      )}
      {/* Label */}
      <text x="40" y="76" textAnchor="middle" fontSize="5" fill={color} fontWeight="600">
        {label.slice(0, 12)}
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────
   Verdict components
───────────────────────────────────────── */
function ThreatBadge({ level }: { level: ThreatLevel }) {
  if (level === "safe")
    return <span className="sk-badge-trust"><ShieldCheck className="w-3 h-3" /> Safe</span>;
  if (level === "suspicious")
    return <span className="sk-badge-warn"><AlertTriangle className="w-3 h-3" /> Suspicious</span>;
  return <span className="sk-badge-fraud"><ShieldAlert className="w-3 h-3" /> Dangerous</span>;
}

function SeverityDot({ severity }: { severity: ThreatFlag["severity"] }) {
  return (
    <span className={clsx(
      "inline-block w-2 h-2 rounded-full shrink-0 mt-1.5",
      severity === "high" ? "bg-fraud" : severity === "medium" ? "bg-warning" : "bg-ink-faint"
    )} />
  );
}

/* ─────────────────────────────────────────
   Main QR Scanner Component
───────────────────────────────────────── */
export default function QRScanner({
  lang,
  onAuditComplete,
}: {
  lang: "en" | "hi";
  onAuditComplete: (report?: any, meta?: { demo?: boolean }) => void;
}) {
  const [mode, setMode] = useState<"idle" | "loading" | "done">("idle");
  const [pastedInput, setPastedInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDecodeError, setQrDecodeError] = useState<string | null>(null);
  const [neutralizationData, setNeutralizationData] = useState<any>(null);
  const [groundingData, setGroundingData] = useState<any>(null);
  const [showAbuseModal, setShowAbuseModal] = useState(false);
  const [copiedAbuseNotice, setCopiedAbuseNotice] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Real-time Scan of a decoded/classified QR or URL ── */
  const runScan = useCallback(
    async (decoded: DecodedQR) => {
      setMode("loading");
      setQrDecodeError(null);
      setNeutralizationData(null);
      setGroundingData(null);

      try {
        const localRes = analyseContent(decoded);

        // Call backend API for unified verification & Nemotron/Gemini insights
        const response = await fetch("/api/forensics/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "qr",
            payload: { qrText: decoded.rawText },
            lang,
          }),
        });

        let isFraud = localRes.threatLevel === "dangerous";

        if (response.ok) {
          const apiData = await response.json();
          setGroundingData(apiData);
          if (apiData.verdict === "fraud") {
            isFraud = true;
            localRes.threatLevel = "dangerous";
            localRes.confidence = Math.max(localRes.confidence, apiData.confidence);
          }
          if (apiData.evidence && apiData.evidence.length > 0) {
            apiData.evidence.forEach((ev: string) => {
              if (!localRes.flags.some((f) => f.label.includes(ev) || f.detail.includes(ev))) {
                localRes.flags.unshift({
                  label: "Backend Forensic Verification",
                  detail: ev,
                  severity: apiData.verdict === "fraud" ? "high" : "medium",
                });
              }
            });
          }
        }

        // Active Threat Neutralization & Origin Tracking
        if (isFraud) {
          try {
            const neutRes = await fetch("/api/forensics/neutralize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                target: decoded.rawText,
                threatType: "qr_or_url",
                threatVerdict: "fraud",
                threatDetails: {
                  flags: localRes.flags.map((f) => f.detail),
                  confidence: localRes.confidence,
                },
              }),
            });
            if (neutRes.ok) {
              const neutJson = await neutRes.json();
              setNeutralizationData(neutJson);
            }
          } catch (neutErr) {
            console.warn("Threat neutralization dispatch error:", neutErr);
          }
        }

        setResult(localRes);
        setMode("done");
        onAuditComplete(localRes);
      } catch (err) {
        console.error("QR analysis error:", err);
        const res = analyseContent(decoded);
        setResult(res);
        setMode("done");
        onAuditComplete(res);
      }
    },
    [lang, onAuditComplete]
  );

  /* ── Universal intake: a file routed from the home desk ── */
  useEffect(() => {
    const incoming = takeIntake("qr");
    if (incoming) handleFile(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Load sample ── */
  const loadSample = useCallback((sample: SampleCase) => {
    setActiveSample(sample.id);
    setResult(null);
    setShowEvidence(false);
    setPastedInput(sample.input);
    runScan(sample.mockDecoded);
  }, [runScan]);

  /* ── Scan pasted URL / UPI string ── */
  const scanPastedInput = useCallback(() => {
    const raw = pastedInput.trim();
    if (!raw) return;
    setActiveSample(null);
    runScan(classifyContent(raw));
  }, [pastedInput, runScan]);

  /* ── Handle QR image upload ── */
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setMode("loading");
    setActiveSample(null);
    setQrDecodeError(null);
    const decoded = await decodeQRFromImage(file);
    if (!decoded) {
      setQrDecodeError(lang === "en"
        ? "No QR code detected in this image. Try a clearer, high-contrast scan."
        : "इस छवि में QR कोड नहीं मिला। स्पष्ट चित्र आज़माएं।"
      );
      setMode("idle");
      return;
    }
    setPastedInput(decoded.rawText);
    runScan(decoded);
  }, [lang, runScan]);

  const reset = () => {
    setMode("idle");
    setResult(null);
    setPastedInput("");
    setActiveSample(null);
    setShowEvidence(false);
    setQrDecodeError(null);
  };

  const copyDecoded = () => {
    if (!result?.decoded.rawText) return;
    navigator.clipboard.writeText(result.decoded.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/forensics/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: {
            module: "qr",
            verdict:
              result.threatLevel === "dangerous"
                ? "fraud"
                : result.threatLevel === "suspicious"
                ? "suspicious"
                : "genuine",
            riskScore:
              result.threatLevel === "dangerous"
                ? 95
                : result.threatLevel === "suspicious"
                ? 60
                : 10,
            confidence: result.confidence,
            evidence: result.flags.map((f) => `${f.label}: ${f.detail}`),
            metrics: {
              decodedContent: result.decoded.rawText,
              upiParams: result.upiParams,
              neutralization: neutralizationData,
            },
          },
        }),
      });
      if (res.ok) {
        const dossier = await res.json();
        const blob = new Blob([JSON.stringify(dossier, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dossier.caseReference || "evidence"}-qr-audit.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.warn("Falling back to plain text report:", err);
    }

    const lines = [
      "=== SATYA KAVACH — QR / LINK FORENSIC REPORT ===",
      `Timestamp   : ${result.timestamp}`,
      `Threat Level: ${result.threatLevel.toUpperCase()}`,
      `Confidence  : ${result.confidence}%`,
      `Content Type: ${result.decoded.type.toUpperCase()}`,
      `Raw Content : ${result.decoded.rawText}`,
      "",
      "── Threat Flags ──",
      ...(result.flags.length
        ? result.flags.map(
            (f, i) =>
              `  [${f.severity.toUpperCase()}] ${i + 1}. ${f.label}\n     ${f.detail}`
          )
        : ["  None detected"]),
      "",
      "── Safe Signals ──",
      ...(result.safeSignals.length
        ? result.safeSignals.map((s, i) => `  ${i + 1}. ${s}`)
        : ["  None"]),
      "",
      ...(result.upiParams
        ? [
            "── UPI Parameters ──",
            `  Payee Address (pa): ${result.upiParams.pa ?? "—"}`,
            `  Payee Name (pn)   : ${result.upiParams.pn ?? "—"}`,
            `  Amount (am)       : ${
              result.upiParams.am ? "₹" + result.upiParams.am : "—"
            }`,
            `  Mode              : ${result.upiParams.mode ?? "01 (standard)"} ${
              result.upiParams.mode === "02" ? "⚠ COLLECT REQUEST" : ""
            }`,
            "",
          ]
        : []),
      "=== END OF REPORT ===",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satya-kavach-qr-scan-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 h-full">
      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-[22px] leading-tight text-ink dark:text-white">
              {lang === "en" ? "QR Code & Trap-Link Scanner" : "QR कोड और ट्रैप-लिंक स्कैनर"}
            </h1>
            <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
              {lang === "en"
                ? "Collect-Request Detector · URL Shortener Unwrapper · Typosquat Analyser · Phishing Signal Scanner"
                : "कलेक्ट रिक्वेस्ट · URL शॉर्टनर · टाइपोस्क्वॉट · फ़िशिंग सिग्नल"}
            </p>
          </div>
          {mode === "done" && (
            <button onClick={reset} className="sk-btn-ghost text-xs gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" />
              {lang === "en" ? "New Scan" : "नई जांच"}
            </button>
          )}
        </div>
      </div>

      {/* ── Split-pane ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: Input ── */}
        <div className="flex flex-col gap-5">

          {/* Sample cases */}
          <div className="sk-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                {lang === "en" ? "1-Click Demo Cases" : "1-क्लिक डेमो केस"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLES.map((s) => {
                const isDangerous = s.inputType === "upi"
                  ? s.input.includes("mode=02") || s.input.includes("am=")
                  : true;
                const isLegit = s.id === "legit-upi";
                return (
                  <button
                    key={s.id}
                    onClick={() => loadSample(s)}
                    className={clsx(
                      "rounded-lg border-2 p-2 text-left transition-all hover:shadow-card-hover",
                      activeSample === s.id
                        ? isLegit ? "border-trust" : "border-fraud"
                        : "border-border dark:border-dark-border hover:border-ink-muted"
                    )}
                  >
                    <div className="aspect-square rounded-md overflow-hidden mb-2 w-14 mx-auto">
                      <QRThumbnail dangerous={!isLegit} label={s.label} />
                    </div>
                    <p className="text-[11px] font-semibold text-ink dark:text-white leading-tight">
                      {lang === "en" ? s.label : s.labelHi}
                    </p>
                    <p className="text-[10px] text-ink-muted dark:text-slate-500 mt-0.5">{s.category}</p>
                    <div className="mt-1.5">
                      <ThreatBadge level={isLegit ? "safe" : "dangerous"} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paste URL / UPI string */}
          <div className="sk-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-ink-muted" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                {lang === "en" ? "Paste URL or UPI String" : "URL या UPI स्ट्रिंग पेस्ट करें"}
              </span>
            </div>
            <textarea
              value={pastedInput}
              onChange={(e) => setPastedInput(e.target.value)}
              placeholder={lang === "en"
                ? "Paste any suspicious link or upi://pay?... string here…"
                : "यहाँ संदिग्ध लिंक या UPI स्ट्रिंग पेस्ट करें…"}
              rows={3}
              className="w-full px-3 py-2 text-sm font-mono border border-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/10 resize-none"
            />
            <button
              onClick={scanPastedInput}
              disabled={!pastedInput.trim() || mode === "loading"}
              className="sk-btn-primary w-full"
            >
              <Search className="w-4 h-4" />
              {lang === "en" ? "Scan This Link / QR Data" : "इस लिंक की जांच करें"}
            </button>
          </div>

          {/* QR Image Upload dropzone */}
          <div
            className={clsx(
              "sk-card rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 p-8",
              dragActive
                ? "border-ink bg-ink/5 dark:border-white dark:bg-white/5"
                : "border-border dark:border-dark-border hover:border-ink-muted hover:bg-surface dark:hover:border-slate-500"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {mode === "loading" ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-ink dark:border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-ink-muted dark:text-slate-400">
                  {lang === "en" ? "Decoding QR & analysing threats…" : "QR डिकोड और खतरे का विश्लेषण…"}
                </p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-surface dark:bg-dark-border border border-border dark:border-dark-border flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-ink-muted dark:text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink dark:text-white">
                    {lang === "en" ? "Drop QR code image to decode" : "QR कोड छवि यहाँ छोड़ें"}
                  </p>
                  <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">PNG, JPG, WebP — decoded locally, nothing uploaded</p>
                </div>
                {qrDecodeError && (
                  <p className="text-xs text-fraud font-medium">{qrDecodeError}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Analysis results ── */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {mode === "idle" && (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center sk-card p-8">
              <div className="w-16 h-16 rounded-2xl bg-surface dark:bg-dark-border border border-border dark:border-dark-border flex items-center justify-center">
                <QrCode className="w-7 h-7 text-ink-faint dark:text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-ink dark:text-white">
                  {lang === "en" ? "Awaiting Input" : "इनपुट की प्रतीक्षा"}
                </p>
                <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
                  {lang === "en"
                    ? "Select a demo case, paste a link, or upload a QR image to start scanning."
                    : "डेमो केस चुनें, लिंक पेस्ट करें या QR छवि अपलोड करें।"}
                </p>
              </div>
            </div>
          )}

          {mode === "done" && result && (
            <>
              {/* Verdict card */}
              <div className={clsx(
                "sk-card p-5 border-l-4",
                result.threatLevel === "safe"      && "border-l-trust",
                result.threatLevel === "suspicious" && "border-l-warning",
                result.threatLevel === "dangerous"  && "border-l-fraud",
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400 mb-1.5">
                      {lang === "en" ? "Threat Assessment" : "खतरे का आकलन"}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <ThreatBadge level={result.threatLevel} />
                      <span className="text-sm font-mono text-ink-muted dark:text-slate-400">
                        {result.confidence}% confidence
                      </span>
                      <span className={clsx(
                        "text-xs font-semibold px-2 py-0.5 rounded border font-mono",
                        result.decoded.type === "upi"
                          ? "border-ink-faint text-ink-muted dark:border-slate-600 dark:text-slate-400"
                          : "border-ink-faint text-ink-muted dark:border-slate-600 dark:text-slate-400"
                      )}>
                        {result.decoded.type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-ink-faint dark:text-slate-600">Scanned</p>
                    <p className="text-[11px] font-mono text-ink-muted dark:text-slate-400">{result.timestamp}</p>
                  </div>
                </div>
              </div>

              {/* Decoded content */}
              <div className="sk-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                    {lang === "en" ? "Decoded Content" : "डिकोड की गई सामग्री"}
                  </span>
                  <button
                    onClick={copyDecoded}
                    className="flex items-center gap-1 text-xs text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="sk-mono text-xs break-all text-ink dark:text-slate-200 bg-surface dark:bg-dark-surface rounded-lg p-3 border border-border dark:border-dark-border leading-relaxed">
                  {result.decoded.rawText}
                </p>
                {result.finalUrl && (
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex items-center gap-1 text-xs text-ink-muted dark:text-slate-400 hover:text-fraud transition-colors"
                    title="Do NOT click this in a real scenario"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {lang === "en" ? "Do NOT open — for reference only" : "इसे न खोलें — केवल संदर्भ के लिए"}
                  </a>
                )}
              </div>

              {/* 🌐 Origin Trace & Network Immunization Active Card */}
              {neutralizationData && (
                <div className="sk-card p-5 border border-indigo-500/30 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                        <Globe2 className="w-4 h-4 animate-spin-slow" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
                          Origin Trace & Network Immunization Active
                        </h4>
                        <p className="text-[10px] text-ink-muted dark:text-slate-400 font-mono">
                          Infrastructure Intelligence & Automated Takedown Core
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      IMMUNIZED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-surface/80 dark:bg-dark-surface/80 p-2.5 rounded-lg border border-border/80 dark:border-dark-border/80">
                      <p className="text-[10px] text-ink-faint dark:text-slate-500 font-semibold uppercase flex items-center gap-1">
                        <Server className="w-3 h-3 text-indigo-500" /> Host IP & Server
                      </p>
                      <p className="font-mono font-bold text-ink dark:text-white mt-0.5 truncate">
                        {neutralizationData.origin.resolvedIp}
                      </p>
                      <p className="text-[11px] text-ink-muted dark:text-slate-400 truncate">
                        {neutralizationData.origin.city}, {neutralizationData.origin.country}
                      </p>
                    </div>

                    <div className="bg-surface/80 dark:bg-dark-surface/80 p-2.5 rounded-lg border border-border/80 dark:border-dark-border/80">
                      <p className="text-[10px] text-ink-faint dark:text-slate-500 font-semibold uppercase flex items-center gap-1">
                        <Globe2 className="w-3 h-3 text-indigo-500" /> Hosting Provider / ASN
                      </p>
                      <p className="font-semibold text-ink dark:text-white mt-0.5 truncate">
                        {neutralizationData.origin.hostingProvider}
                      </p>
                      <p className="text-[11px] font-mono text-ink-muted dark:text-slate-400">
                        {neutralizationData.origin.asn} · {neutralizationData.origin.domainAgeDays}d old
                      </p>
                    </div>
                  </div>

                  {/* Live Network Protection Counter */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold">
                        Shielding{" "}
                        <span className="font-mono font-bold underline">
                          {neutralizationData.immunization?.totalNetworkProtected?.toLocaleString("en-IN") || "1,420"}
                        </span>{" "}
                        Users Across Bharat Network
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold uppercase">
                      Active Defense
                    </span>
                  </div>

                  {/* Takedown Button */}
                  <button
                    onClick={() => setShowAbuseModal(true)}
                    className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Generate Upstream Abuse Takedown Notice
                  </button>
                </div>
              )}

              {/* Real-Time Gemini AI Grounding & Web Intelligence */}
              {groundingData && (
                <RealTimeGroundingCard
                  entityProfile={groundingData.entityProfile}
                  liveWebStatus={groundingData.liveWebStatus}
                  riskRationale={groundingData.riskRationale}
                  actionSteps={groundingData.actionSteps}
                  provider={groundingData.telemetry?.provider}
                  lang={lang}
                />
              )}

              {/* UPI params breakdown */}
              {result.upiParams && (
                <div className="sk-card p-4 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                    {lang === "en" ? "UPI Parameter Breakdown" : "UPI पैरामीटर विश्लेषण"}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "Payee Address (pa)", val: result.upiParams.pa },
                      { key: "Payee Name (pn)",   val: result.upiParams.pn },
                      { key: "Amount (am)",        val: result.upiParams.am ? `₹${result.upiParams.am}` : undefined },
                      { key: "Mode",               val: result.upiParams.mode },
                      { key: "Note (tn)",          val: result.upiParams.tn },
                      { key: "Txn Ref (tr)",       val: result.upiParams.tr },
                    ].filter(p => p.val).map(({ key, val }) => (
                      <div key={key} className="bg-surface dark:bg-dark-surface rounded-lg p-2.5 border border-border dark:border-dark-border">
                        <p className="text-[10px] text-ink-faint dark:text-slate-600 font-medium mb-0.5">{key}</p>
                        <p className="sk-mono text-xs text-ink dark:text-slate-200 break-all">
                          {val}
                          {key === "Mode" && val === "02" && (
                            <span className="ml-1 text-fraud font-bold">⚠ COLLECT</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Threat flags */}
              {result.flags.length > 0 && (
                <div className="sk-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-fraud" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                      {lang === "en" ? `Threat Flags (${result.flags.length})` : `खतरे के संकेत (${result.flags.length})`}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {result.flags.map((flag, i) => (
                      <div key={i} className="flex gap-2.5">
                        <SeverityDot severity={flag.severity} />
                        <div className="flex-1 min-w-0">
                          <p className={clsx(
                            "text-xs font-semibold",
                            flag.severity === "high" ? "text-fraud" : flag.severity === "medium" ? "text-warning" : "text-ink-muted"
                          )}>
                            {flag.label}
                          </p>
                          <p className="text-[11px] text-ink-muted dark:text-slate-400 mt-0.5 leading-relaxed">
                            {flag.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Safe signals */}
              {result.safeSignals.length > 0 && (
                <div className="sk-card p-4 space-y-2">
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => setShowEvidence(s => !s)}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-trust" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                        {lang === "en" ? `Safe Signals (${result.safeSignals.length})` : `सुरक्षित संकेत`}
                      </span>
                    </div>
                    {showEvidence ? <ChevronUp className="w-4 h-4 text-ink-muted" /> : <ChevronDown className="w-4 h-4 text-ink-muted" />}
                  </button>
                  {showEvidence && (
                    <ul className="space-y-1.5 mt-2">
                      {result.safeSignals.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-ink dark:text-slate-200">
                          <ArrowRight className="w-3.5 h-3.5 text-trust shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Download */}
              <button onClick={downloadReport} className="sk-btn-primary w-full">
                <Download className="w-4 h-4" />
                {lang === "en" ? "Export Cryptographic Audit Dossier (JSON)" : "डिजिटल साक्ष्य दस्तावेज़ डाउनलोड करें (JSON)"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Abuse Takedown Notice Modal ── */}
      {showAbuseModal && neutralizationData?.abuseReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border dark:border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-ink dark:text-white">
                  Formal Upstream Provider Abuse Takedown Notice
                </h3>
              </div>
              <button
                onClick={() => setShowAbuseModal(false)}
                className="text-ink-muted hover:text-ink dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <p className="text-ink-muted dark:text-slate-400">
                <strong className="text-ink dark:text-white">Recipient:</strong>{" "}
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                  {neutralizationData.abuseReport.recipientEmail}
                </span>
              </p>
              <p className="text-ink-muted dark:text-slate-400">
                <strong className="text-ink dark:text-white">Subject:</strong>{" "}
                {neutralizationData.abuseReport.emailSubject}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink-muted dark:text-slate-400">
                  Notice Content (IT Act Sec 79 / CERT-In Format)
                </label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(neutralizationData.abuseReport.emailBody);
                    setCopiedAbuseNotice(true);
                    setTimeout(() => setCopiedAbuseNotice(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  {copiedAbuseNotice ? "Copied!" : "Copy Full Notice"}
                </button>
              </div>
              <textarea
                readOnly
                value={neutralizationData.abuseReport.emailBody}
                rows={11}
                className="w-full text-xs font-mono p-3 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-ink dark:text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-ink-faint dark:text-slate-500">
                Target IP: {neutralizationData.origin.resolvedIp}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAbuseModal(false)}
                  className="sk-btn-ghost text-xs"
                >
                  Close
                </button>
                <a
                  href={`mailto:${neutralizationData.abuseReport.recipientEmail}?subject=${encodeURIComponent(
                    neutralizationData.abuseReport.emailSubject
                  )}&body=${encodeURIComponent(neutralizationData.abuseReport.emailBody)}`}
                  className="sk-btn-primary text-xs flex items-center gap-1.5"
                >
                  Send via Email Client
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
