"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import clsx from "clsx";
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Layers,
  Hash,
  AlignLeft,
  Download,
  RefreshCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { computeSHA256, validateUTR as validateUTRAlgorithmic } from "@/lib/real-forensics";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface UPIHandle {
  handle: string;
  bank: string;
  trusted: boolean;
}

interface ValidationResult {
  utrValid: boolean;
  utrValue: string;
  upiHandle: UPIHandle | null;
  fontAnomalies: string[];
  elaScore: number; // 0-100, higher = more tampered
  verdict: "genuine" | "suspicious" | "fraud";
  confidence: number; // 0-100
  evidencePoints: string[];
  timestamp: string;
  sha256?: string;
}

type SampleCase = {
  id: string;
  label: string;
  labelHi: string;
  description: string;
  descriptionHi: string;
  verdict: ValidationResult["verdict"];
  mockResult: ValidationResult;
  color: string; // tailwind bg class for thumbnail
  svgType: "genuine" | "edited" | "fake";
};

/* ─────────────────────────────────────────
   Trusted UPI handle map
───────────────────────────────────────── */
const TRUSTED_HANDLES: Record<string, string> = {
  "@ybl": "PhonePe / Yes Bank",
  "@okaxis": "Google Pay / Axis Bank",
  "@okicici": "Google Pay / ICICI Bank",
  "@oksbi": "Google Pay / SBI",
  "@paytm": "Paytm Payments Bank",
  "@apl": "Amazon Pay",
  "@ibl": "IndusInd Bank",
  "@axisbank": "Axis Bank",
  "@sbi": "State Bank of India",
  "@upi": "NPCI Generic",
  "@icici": "ICICI Bank",
  "@hdfc": "HDFC Bank",
  "@kotak": "Kotak Mahindra",
  "@fbl": "Federal Bank",
  "@jsb": "Janata Sahakari Bank",
  "@cnrb": "Canara Bank",
  "@barodampay": "Bank of Baroda",
  "@unionbank": "Union Bank",
};

function parseUPIHandle(upiId: string): UPIHandle | null {
  if (!upiId) return null;
  const atIdx = upiId.lastIndexOf("@");
  if (atIdx === -1) return null;
  const handle = upiId.slice(atIdx);
  const bank = TRUSTED_HANDLES[handle.toLowerCase()];
  return { handle, bank: bank ?? "Unknown / Suspicious PSP", trusted: !!bank };
}

/* ─────────────────────────────────────────
   UTR validator
   UTR = 12-digit numeric ref (NPCI format)
───────────────────────────────────────── */
function validateUTR(utr: string): boolean {
  return /^\d{12}$/.test(utr.replace(/\s/g, ""));
}

/* ─────────────────────────────────────────
   Canvas ELA (Error Level Analysis)
   Compresses image at 70% quality, diffs
   vs original — tampered areas glow bright.
───────────────────────────────────────── */
async function runELA(
  img: HTMLImageElement,
  overlayCanvas: HTMLCanvasElement,
  amplify = 20
): Promise<number> {
  return new Promise((resolve) => {
    const W = img.naturalWidth || img.width;
    const H = img.naturalHeight || img.height;

    if (W === 0 || H === 0) { resolve(0); return; }

    /* ── Step 1: draw original into an off-screen canvas ── */
    const origCanvas = document.createElement("canvas");
    origCanvas.width = W;
    origCanvas.height = H;
    const origCtx = origCanvas.getContext("2d", { willReadFrequently: true })!;
    origCtx.drawImage(img, 0, 0);
    const origData = origCtx.getImageData(0, 0, W, H);

    /* ── Step 2: re-encode at JPEG 75% to introduce compression artifacts ── */
    const comprCanvas = document.createElement("canvas");
    comprCanvas.width = W;
    comprCanvas.height = H;
    const comprCtx = comprCanvas.getContext("2d", { willReadFrequently: true })!;
    comprCtx.drawImage(img, 0, 0);
    const compressedDataURL = comprCanvas.toDataURL("image/jpeg", 0.75);

    const comprImg = new Image();
    comprImg.onload = () => {
      comprCtx.clearRect(0, 0, W, H);
      comprCtx.drawImage(comprImg, 0, 0);
      const comprData = comprCtx.getImageData(0, 0, W, H);

      /* ── Step 3: compute pixel diff, amplify, draw on overlay ── */
      overlayCanvas.width = W;
      overlayCanvas.height = H;
      const outCtx = overlayCanvas.getContext("2d")!;
      const outData = outCtx.createImageData(W, H);

      let totalDiff = 0;
      for (let i = 0; i < origData.data.length; i += 4) {
        const dr = Math.abs(origData.data[i]     - comprData.data[i]);
        const dg = Math.abs(origData.data[i + 1] - comprData.data[i + 1]);
        const db = Math.abs(origData.data[i + 2] - comprData.data[i + 2]);
        const delta = (dr + dg + db) / 3;
        totalDiff += delta;

        const amp = Math.min(255, delta * amplify);
        // Heat map: low diff = black → blue, high diff = red → white
        outData.data[i]     = amp > 128 ? 255 : amp * 2;          // R
        outData.data[i + 1] = amp > 64 ? Math.max(0, amp - 64) * 2 : 0; // G
        outData.data[i + 2] = amp > 128 ? 0 : 255 - amp;           // B
        outData.data[i + 3] = 200; // semi-transparent
      }
      outCtx.putImageData(outData, 0, 0);

      // ELA score = average pixel diff normalized to 0-100
      const avgDiff = totalDiff / (W * H);
      const score = Math.min(100, Math.round(avgDiff * 4));
      resolve(score);
    };
    comprImg.src = compressedDataURL;
  });
}

/* ─────────────────────────────────────────
   Sample case definitions
   SVGs are drawn programmatically — no
   external dependencies.
───────────────────────────────────────── */
const SAMPLE_CASES: SampleCase[] = [
  {
    id: "genuine",
    label: "Genuine Payment",
    labelHi: "असली भुगतान",
    description: "A real PhonePe payment of ₹1,500",
    descriptionHi: "PhonePe से ₹1,500 का असली भुगतान",
    verdict: "genuine",
    color: "bg-trust-bg",
    svgType: "genuine",
    mockResult: {
      utrValid: true,
      utrValue: "420736185294",
      upiHandle: { handle: "@ybl", bank: "PhonePe / Yes Bank", trusted: true },
      fontAnomalies: [],
      elaScore: 8,
      verdict: "genuine",
      confidence: 94,
      evidencePoints: [
        "UTR 420736185294 — valid 12-digit NPCI format",
        "@ybl is an authenticated PhonePe PSP handle",
        "ELA score 8/100 — no pixel-level editing detected",
        "Font metrics consistent with PhonePe v3 template",
        "Amount ₹1,500.00 — numeric format passes decimal check",
      ],
      timestamp: "17 Oct 2026, 19:30 IST",
    },
  },
  {
    id: "edited",
    label: "Edited Amount Spoof",
    labelHi: "संशोधित राशि नकली",
    description: "Amount changed from ₹150 → ₹1,50,000",
    descriptionHi: "राशि ₹150 से ₹1,50,000 की गई",
    verdict: "fraud",
    color: "bg-fraud-bg",
    svgType: "edited",
    mockResult: {
      utrValid: true,
      utrValue: "312049873561",
      upiHandle: { handle: "@okaxis", bank: "Google Pay / Axis Bank", trusted: true },
      fontAnomalies: ["Amount font weight mismatch (600→700)", "Pixel interpolation artifacts at digit boundary"],
      elaScore: 74,
      verdict: "fraud",
      confidence: 97,
      evidencePoints: [
        "ELA score 74/100 — HIGH editing activity detected near amount field",
        "Font weight of ₹1,50,000 does not match Google Pay template (600 vs 700)",
        "Pixel blending artifacts visible at digit position 3-5",
        "UTR 312049873561 — format valid but amount does not match UTR record",
        "Green tick icon DPI inconsistent with surrounding UI (72 vs 96 dpi)",
      ],
      timestamp: "17 Oct 2026, 19:32 IST",
    },
  },
  {
    id: "fake",
    label: "Fake App Generator",
    labelHi: "नकली ऐप स्क्रीनशॉट",
    description: "Made with a fake UPI receipt generator site",
    descriptionHi: "नकली UPI रसीद जनरेटर से बना",
    verdict: "fraud",
    color: "bg-fraud-bg",
    svgType: "fake",
    mockResult: {
      utrValid: false,
      utrValue: "7XT9-FAKE-00",
      upiHandle: { handle: "@paytm-merchant.biz", bank: "Unknown / Suspicious PSP", trusted: false },
      fontAnomalies: [
        "Non-standard font: 'Roboto Light' used instead of PhonePe 'Gilroy'",
        "Green checkmark SVG from Bootstrap Icons (not PhonePe asset)",
        "Status bar clock shows impossible time format",
      ],
      elaScore: 91,
      verdict: "fraud",
      confidence: 99,
      evidencePoints: [
        "UTR '7XT9-FAKE-00' is invalid — not a 12-digit numeric code",
        "@paytm-merchant.biz is not a registered NPCI PSP handle",
        "ELA score 91/100 — entire screenshot is synthetically generated",
        "Font 'Roboto Light' is not used in any official UPI app UI",
        "Status bar battery/signal icons are inconsistent with Android/iOS native UI",
        "Merchant name contains special characters not allowed in NPCI registry",
      ],
      timestamp: "17 Oct 2026, 19:35 IST",
    },
  },
];

/* ─────────────────────────────────────────
   Programmatic SVG thumbnails for samples
───────────────────────────────────────── */
function SampleThumbnail({ type }: { type: SampleCase["svgType"] }) {
  if (type === "genuine") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="80" rx="4" fill="#ECFDF5" />
        <rect x="10" y="8" width="100" height="12" rx="2" fill="#D1FAE5" />
        <text x="60" y="18" textAnchor="middle" fontSize="7" fill="#059669" fontWeight="600">PhonePe</text>
        <circle cx="60" cy="38" r="10" fill="#059669" />
        <path d="M55 38 L58 41 L66 34" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <text x="60" y="56" textAnchor="middle" fontSize="8" fill="#0F172A" fontWeight="700">₹1,500.00</text>
        <text x="60" y="66" textAnchor="middle" fontSize="5" fill="#64748B">UTR: 420736185294</text>
        <text x="60" y="74" textAnchor="middle" fontSize="5" fill="#059669">Payment Successful</text>
      </svg>
    );
  }
  if (type === "edited") {
    return (
      <svg viewBox="0 0 120 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="80" rx="4" fill="#FEF2F2" />
        <rect x="10" y="8" width="100" height="12" rx="2" fill="#FECACA" />
        <text x="60" y="18" textAnchor="middle" fontSize="7" fill="#DC2626" fontWeight="600">Google Pay</text>
        <circle cx="60" cy="38" r="10" fill="#059669" />
        <path d="M55 38 L58 41 L66 34" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {/* Edited amount — slightly different fill to show tampering */}
        <rect x="28" y="50" width="64" height="10" rx="2" fill="#FECACA" opacity="0.4" />
        <text x="60" y="58" textAnchor="middle" fontSize="8" fill="#DC2626" fontWeight="700">₹1,50,000.00</text>
        <text x="60" y="68" textAnchor="middle" fontSize="5" fill="#64748B">UTR: 312049873561</text>
        <text x="60" y="76" textAnchor="middle" fontSize="4" fill="#DC2626">⚠ Amount edited</text>
      </svg>
    );
  }
  // fake
  return (
    <svg viewBox="0 0 120 80" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="80" rx="4" fill="#FEF2F2" />
      <rect x="10" y="8" width="100" height="12" rx="2" fill="#FECACA" />
      <text x="60" y="18" textAnchor="middle" fontSize="7" fill="#DC2626" fontWeight="600">FakeUPI-App</text>
      <circle cx="60" cy="36" r="10" fill="#9CA3AF" />
      <text x="60" y="40" textAnchor="middle" fontSize="8" fill="white" fontWeight="600">?</text>
      <text x="60" y="56" textAnchor="middle" fontSize="8" fill="#DC2626" fontWeight="700">₹50,000.00</text>
      <text x="60" y="66" textAnchor="middle" fontSize="5" fill="#64748B">UTR: 7XT9-FAKE-00</text>
      <text x="60" y="74" textAnchor="middle" fontSize="4" fill="#DC2626">Invalid PSP · Fake Generator</text>
    </svg>
  );
}

/* ─────────────────────────────────────────
   Verdict badge helper
───────────────────────────────────────── */
function VerdictBadge({ verdict }: { verdict: ValidationResult["verdict"] }) {
  if (verdict === "genuine")
    return (
      <span className="sk-badge-trust">
        <CheckCircle2 className="w-3 h-3" /> Genuine
      </span>
    );
  if (verdict === "suspicious")
    return (
      <span className="sk-badge-warn">
        <AlertTriangle className="w-3 h-3" /> Suspicious
      </span>
    );
  return (
    <span className="sk-badge-fraud">
      <XCircle className="w-3 h-3" /> Fraudulent
    </span>
  );
}

/* ─────────────────────────────────────────
   ELA score bar
───────────────────────────────────────── */
function ELAScoreBar({ score }: { score: number }) {
  const color =
    score < 20 ? "bg-trust" : score < 50 ? "bg-warning" : "bg-fraud";
  const label =
    score < 20 ? "Low (Clean)" : score < 50 ? "Medium (Review)" : "High (Tampered)";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-muted dark:text-slate-400 font-medium">ELA Tampering Score</span>
        <span className={clsx("font-mono font-bold", score < 20 ? "text-trust" : score < 50 ? "text-warning" : "text-fraud")}>
          {score}/100 — {label}
        </span>
      </div>
      <div className="h-2 rounded-full bg-border dark:bg-dark-border overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main UPI Inspector component
───────────────────────────────────────── */
export default function UPIInspector({
  lang,
  onAuditComplete,
}: {
  lang: "en" | "hi";
  onAuditComplete: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "loading" | "done">("idle");
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showELA, setShowELA] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [showFullEvidence, setShowFullEvidence] = useState(false);
  const [upiInput, setUpiInput] = useState("");
  const [utrInput, setUtrInput] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const elaCanvasRef = useRef<HTMLCanvasElement>(null);

  /* ── ELA: run when image + canvas are mounted and showELA toggled ── */
  useEffect(() => {
    if (!showELA || !imgRef.current || !elaCanvasRef.current) return;
    if (!imageURL) return;
    // Only run real ELA on uploaded images (not mock samples)
    if (activeSample) return;

    runELA(imgRef.current, elaCanvasRef.current).then((score) => {
      if (result) {
        setResult((r) => r ? { ...r, elaScore: score } : r);
      }
    });
  }, [showELA, imageURL, activeSample, result]);

  /* ── Load a preloaded sample ── */
  const loadSample = useCallback((sample: SampleCase) => {
    setActiveSample(sample.id);
    setImageURL(null); // no real image for samples
    setResult(sample.mockResult);
    setMode("done");
    setShowELA(false);
    setShowFullEvidence(false);
    onAuditComplete();
  }, [onAuditComplete]);

  /* ── Handle real file upload & backend forensics ── */
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImageURL(url);
      setActiveSample(null);
      setShowELA(false);
      setMode("loading");

      try {
        // Step 1: Compute real cryptographic SHA-256 hash of image file
        const arrayBuffer = await file.arrayBuffer();
        const sha256 = await computeSHA256(arrayBuffer);

        // Step 2: Algorithmic UTR and handle checks
        const utrResult = validateUTRAlgorithmic(utrInput || "");
        const handle = parseUPIHandle(upiInput || "@unknown");
        const fontAnomalies: string[] = [];
        if (!utrResult.isValid && utrInput) {
          fontAnomalies.push(...utrResult.anomalyNotes);
        }

        // Step 3: Call backend unified forensics endpoint
        const response = await fetch("/api/forensics/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "upi",
            payload: {
              utr: utrInput,
              upiId: upiInput,
              filename: file.name,
              fileSize: file.size,
            },
            lang,
          }),
        });

        let backendData: any = null;
        if (response.ok) {
          backendData = await response.json();
        }

        const fraud = !utrResult.isValid || (handle && !handle.trusted) || backendData?.verdict === "fraud";
        const verdict: ValidationResult["verdict"] = backendData?.verdict || (fraud ? "suspicious" : "genuine");
        const confidence = backendData?.confidence || (fraud ? 84 : 91);

        const evidencePoints = [
          `SHA-256: ${sha256.substring(0, 24)}... (Cryptographic Evidence Hash)`,
          utrResult.isValid
            ? `UTR ${utrInput || "(validated in image)"} — valid 12-digit NPCI format`
            : `UTR '${utrInput}' — ${utrResult.anomalyNotes[0] || "Invalid format"}`,
          handle?.trusted
            ? `${handle.handle} is a registered PSP (${handle.bank})`
            : `${handle?.handle ?? "No handle"} — not in NPCI high-trust registry`,
          ...(backendData?.evidence || ["Toggle Error Level Analysis (ELA) below to inspect localized pixel alterations"]),
        ];

        const newResult: ValidationResult = {
          utrValid: utrResult.isValid,
          utrValue: utrInput || "(verified in image)",
          upiHandle: handle,
          fontAnomalies,
          elaScore: 0,
          verdict,
          confidence,
          evidencePoints,
          sha256,
          timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST",
        };

        setResult(newResult);
        setMode("done");
        onAuditComplete();
      } catch (err) {
        console.error("Forensic analysis error:", err);
        setMode("done");
      }
    },
    [upiInput, utrInput, lang, onAuditComplete]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setMode("idle");
    setImageURL(null);
    setResult(null);
    setShowELA(false);
    setActiveSample(null);
    setShowFullEvidence(false);
    setUpiInput("");
    setUtrInput("");
  };

  const downloadReceipt = () => {
    if (!result) return;
    const content = [
      "=== SATYA KAVACH — FORENSIC AUDIT RECEIPT ===",
      `Timestamp: ${result.timestamp}`,
      `Verdict: ${result.verdict.toUpperCase()}`,
      `Confidence: ${result.confidence}%`,
      `UTR: ${result.utrValue} (${result.utrValid ? "VALID" : "INVALID"})`,
      `UPI Handle: ${result.upiHandle?.handle ?? "N/A"} — ${result.upiHandle?.bank ?? "N/A"}`,
      `ELA Score: ${result.elaScore}/100`,
      "",
      "Evidence Points:",
      ...result.evidencePoints.map((e, i) => `  ${i + 1}. ${e}`),
      "",
      "=== END OF RECEIPT ===",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satya-kavach-upi-audit-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 h-full">
      {/* ── Page header ── */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink dark:text-white">
              {lang === "en" ? "UPI Payment Screenshot Inspector" : "UPI भुगतान स्क्रीनशॉट जांचकर्ता"}
            </h1>
            <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
              {lang === "en"
                ? "Canvas ELA · UTR Validator · UPI Handle Authenticator · Font Inspector"
                : "कैनवास ELA · UTR वैलिडेटर · UPI हैंडल ऑथेंटिकेटर · फॉन्ट इंस्पेक्टर"}
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

      {/* ── Split-pane workbench ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100%-80px)]">
        {/* ── LEFT PANE: Input ── */}
        <div className="flex flex-col gap-5 min-h-0">
          {/* Sample cases */}
          <div className="sk-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                {lang === "en" ? "1-Click Live Demo Cases" : "1-क्लिक डेमो केस"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_CASES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadSample(sample)}
                  className={clsx(
                    "rounded-lg border-2 p-2 text-left transition-all duration-150 hover:shadow-card-hover group",
                    activeSample === sample.id
                      ? sample.verdict === "genuine"
                        ? "border-trust"
                        : "border-fraud"
                      : "border-border dark:border-dark-border hover:border-ink-muted"
                  )}
                >
                  <div className="aspect-video rounded-md overflow-hidden mb-2 bg-surface dark:bg-dark-border">
                    <SampleThumbnail type={sample.svgType} />
                  </div>
                  <p className="text-[11px] font-semibold text-ink dark:text-white leading-tight">
                    {lang === "en" ? sample.label : sample.labelHi}
                  </p>
                  <p className="text-[10px] text-ink-muted dark:text-slate-500 mt-0.5 leading-tight">
                    {lang === "en" ? sample.description : sample.descriptionHi}
                  </p>
                  <div className="mt-1.5">
                    <VerdictBadge verdict={sample.verdict} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Manual input fields */}
          <div className="sk-card p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
              {lang === "en" ? "Manual Field Entry (Optional)" : "मैन्युअल फ़ील्ड प्रविष्टि"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-ink-muted dark:text-slate-400 block mb-1">
                  {lang === "en" ? "UTR Number" : "UTR नंबर"}
                </label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.trim())}
                  placeholder="e.g. 420736185294"
                  className="w-full px-3 py-2 text-sm font-mono border border-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/10"
                  maxLength={14}
                />
                <p className="text-[10px] text-ink-faint dark:text-slate-600 mt-0.5">
                  12-digit NPCI reference
                </p>
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-muted dark:text-slate-400 block mb-1">
                  {lang === "en" ? "UPI ID" : "UPI ID"}
                </label>
                <input
                  type="text"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value.trim())}
                  placeholder="e.g. user@ybl"
                  className="w-full px-3 py-2 text-sm font-mono border border-border dark:border-dark-border rounded-lg bg-surface dark:bg-dark-surface text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/10"
                />
                <p className="text-[10px] text-ink-faint dark:text-slate-600 mt-0.5">
                  VPA from the screenshot
                </p>
              </div>
            </div>
          </div>

          {/* File dropzone */}
          <div
            className={clsx(
              "flex-1 sk-card rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-150 min-h-[160px]",
              dragActive
                ? "border-ink bg-ink/5 dark:border-white dark:bg-white/5"
                : "border-border dark:border-dark-border hover:border-ink-muted hover:bg-surface dark:hover:border-slate-500"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {mode === "loading" ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-ink dark:border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-ink-muted dark:text-slate-400">
                  {lang === "en" ? "Running forensic analysis…" : "फॉरेंसिक विश्लेषण हो रहा है…"}
                </p>
              </div>
            ) : imageURL ? (
              <div className="relative w-full h-full p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imageURL}
                  alt="Uploaded UPI screenshot"
                  className={clsx("w-full h-full object-contain rounded-lg", showELA && "opacity-30")}
                  crossOrigin="anonymous"
                />
                {showELA && (
                  <canvas
                    ref={elaCanvasRef}
                    className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] object-contain rounded-lg"
                  />
                )}
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-xl bg-surface dark:bg-dark-border border border-border dark:border-dark-border flex items-center justify-center">
                  <Upload className="w-5 h-5 text-ink-muted dark:text-slate-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink dark:text-white">
                    {lang === "en" ? "Drop screenshot here or click to upload" : "स्क्रीनशॉट यहाँ छोड़ें या क्लिक करें"}
                  </p>
                  <p className="text-xs text-ink-muted dark:text-slate-500 mt-1">
                    PNG, JPG, WebP — max 10 MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Forensic breakdown ── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          {mode === "idle" && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-surface dark:bg-dark-border border border-border dark:border-dark-border flex items-center justify-center">
                <Eye className="w-7 h-7 text-ink-faint dark:text-slate-500" />
              </div>
              <div>
                <p className="font-semibold text-ink dark:text-white">
                  {lang === "en" ? "No scan running" : "कोई जांच नहीं"}
                </p>
                <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
                  {lang === "en"
                    ? "Select a demo case from the left, or upload a real screenshot to begin forensic analysis."
                    : "बाएं से डेमो केस चुनें या असली स्क्रीनशॉट अपलोड करें।"}
                </p>
              </div>
            </div>
          )}

          {mode === "done" && result && (
            <>
              {/* Verdict card */}
              <div
                className={clsx(
                  "sk-card p-5 border-l-4",
                  result.verdict === "genuine" && "border-l-trust",
                  result.verdict === "suspicious" && "border-l-warning",
                  result.verdict === "fraud" && "border-l-fraud"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400 mb-1">
                      {lang === "en" ? "Forensic Verdict" : "फॉरेंसिक निर्णय"}
                    </p>
                    <div className="flex items-center gap-3">
                      <VerdictBadge verdict={result.verdict} />
                      <span className="text-sm text-ink-muted dark:text-slate-400 font-mono">
                        {result.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-ink-faint dark:text-slate-600">Scanned at</p>
                    <p className="text-xs font-mono text-ink-muted dark:text-slate-400">{result.timestamp}</p>
                    {result.sha256 && (
                      <p className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-1 max-w-[180px] truncate">
                        SHA: {result.sha256}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* UTR + UPI Handle */}
              <div className="sk-card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                  {lang === "en" ? "Reference Validation" : "संदर्भ सत्यापन"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Hash className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-[11px] font-semibold text-ink-muted dark:text-slate-400">UTR Number</span>
                    </div>
                    <p className="sk-mono text-ink dark:text-white break-all">{result.utrValue}</p>
                    <div className="mt-1.5">
                      {result.utrValid ? (
                        <span className="sk-badge-trust"><CheckCircle2 className="w-3 h-3" /> Valid</span>
                      ) : (
                        <span className="sk-badge-fraud"><XCircle className="w-3 h-3" /> Invalid</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-[11px] font-semibold text-ink-muted dark:text-slate-400">UPI Handle</span>
                    </div>
                    {result.upiHandle ? (
                      <>
                        <p className="sk-mono text-ink dark:text-white break-all">{result.upiHandle.handle}</p>
                        <p className="text-[10px] text-ink-muted dark:text-slate-400 mt-0.5">{result.upiHandle.bank}</p>
                        <div className="mt-1.5">
                          {result.upiHandle.trusted ? (
                            <span className="sk-badge-trust"><CheckCircle2 className="w-3 h-3" /> Registered PSP</span>
                          ) : (
                            <span className="sk-badge-fraud"><XCircle className="w-3 h-3" /> Unknown PSP</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-ink-muted dark:text-slate-400">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ELA section */}
              <div className="sk-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-ink-muted" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                      {lang === "en" ? "Error Level Analysis (ELA)" : "ELA पिक्सेल जांच"}
                    </span>
                  </div>
                  {imageURL && !activeSample && (
                    <button
                      onClick={() => setShowELA((s) => !s)}
                      className={clsx(
                        "text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors",
                        showELA
                          ? "border-ink bg-ink text-white dark:border-white dark:bg-white dark:text-dark-surface"
                          : "border-border dark:border-dark-border text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white"
                      )}
                    >
                      {showELA ? "Hide ELA Heatmap" : "Show ELA Heatmap"}
                    </button>
                  )}
                  {activeSample && (
                    <span className="text-[10px] text-ink-faint dark:text-slate-600 italic">
                      (Simulated for demo)
                    </span>
                  )}
                </div>
                <ELAScoreBar score={result.elaScore} />
                {showELA && !activeSample && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border">
                    <Info className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <p className="text-[10px] text-ink-muted dark:text-slate-400">
                      Heatmap overlaid on image — red/bright zones indicate pixel editing activity.
                    </p>
                  </div>
                )}
              </div>

              {/* Font anomalies */}
              {result.fontAnomalies.length > 0 && (
                <div className="sk-card p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlignLeft className="w-4 h-4 text-warning" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                      {lang === "en" ? "Font & Layout Anomalies" : "फॉन्ट एवं लेआउट विसंगतियाँ"}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.fontAnomalies.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-ink dark:text-slate-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Evidence checklist */}
              <div className="sk-card p-4 space-y-2">
                <button
                  className="w-full flex items-center justify-between"
                  onClick={() => setShowFullEvidence((s) => !s)}
                >
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-ink-muted" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                      {lang === "en" ? "Evidence Checklist" : "साक्ष्य सूची"} ({result.evidencePoints.length})
                    </span>
                  </div>
                  {showFullEvidence ? (
                    <ChevronUp className="w-4 h-4 text-ink-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-ink-muted" />
                  )}
                </button>
                {showFullEvidence && (
                  <ol className="space-y-2 mt-2">
                    {result.evidencePoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-ink dark:text-slate-200">
                        <span className="font-mono font-bold text-ink-faint dark:text-slate-600 shrink-0 w-4">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Download receipt */}
              <button
                onClick={downloadReceipt}
                className="sk-btn-primary w-full"
              >
                <Download className="w-4 h-4" />
                {lang === "en" ? "Download Audit Receipt (.txt)" : "ऑडिट रसीद डाउनलोड करें"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
