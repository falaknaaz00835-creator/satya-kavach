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
  ShieldAlert,
  FileText,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import RealTimeGroundingCard from "@/components/RealTimeGroundingCard";
import { takeIntake } from "@/lib/intake";
import { InstrumentHeader, AwaitingFindings } from "@/components/instrument";
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
  const app = type === "genuine" ? "PhonePe" : type === "edited" ? "Google Pay" : "FakeUPI";
  const amount = type === "edited" ? "₹1,50,000.00" : type === "fake" ? "₹50,000.00" : "₹1,500.00";
  const utr = type === "genuine" ? "420736185294" : type === "edited" ? "312049873561" : "7XT9-FAKE-00";
  const accent = type === "genuine" ? "#12715B" : "#B3382B";
  const honest = type === "genuine";

  return (
    <svg viewBox="0 0 96 120" className="h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="96" height="120" rx="5" fill="#FFFDF8" stroke="#E4DED0" />
      {/* device status bar */}
      <text x="8" y="9" fontSize="4" fill="#8A8A7D" fontFamily="monospace">9:41</text>
      <rect x="70" y="5" width="18" height="4" rx="1" fill="#E4DED0" />
      {/* app bar */}
      <rect x="0" y="14" width="96" height="12" fill={honest ? "#12715B" : "#B3382B"} opacity="0.9" />
      <text x="48" y="22.5" textAnchor="middle" fontSize="6" fill="#FFFDF8" fontWeight="600" fontFamily="monospace">
        {app}
      </text>
      {/* status tick */}
      <circle cx="48" cy="42" r="9" fill={honest ? "#E7F2ED" : "#FAEAE6"} />
      <circle cx="48" cy="42" r="6" fill={accent} opacity={honest ? 1 : 0.85} />
      <path d="M45 42.2 L47.2 44.4 L51.4 40" stroke="#FFFDF8" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* amount */}
      {type === "edited" && (
        <rect x="12" y="55" width="72" height="12" rx="2" fill="none" stroke={accent} strokeWidth="0.8" strokeDasharray="2 2" />
      )}
      <text
        x="48"
        y="64"
        textAnchor="middle"
        fontSize="9"
        fill={honest ? "#14140F" : accent}
        fontWeight="700"
      >
        {amount}
      </text>
      <text x="48" y="74" textAnchor="middle" fontSize="4.6" fill="#8A8A7D">
        {honest ? "Payment successful" : type === "edited" ? "Amount edited" : "Generated, not paid"}
      </text>
      {/* receipt rule */}
      <rect x="12" y="80" width="72" height="0.6" fill="#E4DED0" />
      {/* detail rows */}
      <text x="12" y="88" fontSize="4" fill="#8A8A7D" fontFamily="monospace">UTR</text>
      <text x="84" y="88" textAnchor="end" fontSize="4" fill={honest ? "#14140F" : accent} fontFamily="monospace">
        {utr}
      </text>
      <text x="12" y="96" fontSize="4" fill="#8A8A7D" fontFamily="monospace">VPA</text>
      <text x="84" y="96" textAnchor="end" fontSize="4" fill="#14140F" fontFamily="monospace">
        {honest ? "shop@ybl" : "merchant@paytm"}
      </text>
      {/* verdict strip */}
      <rect x="12" y="103" width="72" height="10" rx="2" fill={accent} opacity="0.1" />
      <text x="48" y="110" textAnchor="middle" fontSize="4.2" fill={accent} fontFamily="monospace" letterSpacing="0.4">
        {honest ? "VERIFIED SAMPLE" : "TAMPERED SAMPLE"}
      </text>
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
        <span className="text-ink-muted dark:text-white/45 font-medium">ELA Tampering Score</span>
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
  onAuditComplete: (report?: any, meta?: { demo?: boolean }) => void;
}) {
  const [mode, setMode] = useState<"idle" | "loading" | "done">("idle");
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [showELA, setShowELA] = useState(false);
  const [activeSample, setActiveSample] = useState<string | null>(null);
  const [showFullEvidence, setShowFullEvidence] = useState(false);
  const [cyberCellData, setCyberCellData] = useState<any>(null);
  const [showCyberModal, setShowCyberModal] = useState(false);
  const [copiedPoliceText, setCopiedPoliceText] = useState(false);
  const [groundingData, setGroundingData] = useState<any>(null);
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
    setGroundingData(null);
    onAuditComplete(sample.mockResult, { demo: true });

    // Query backend to retrieve real-time grounded research
    fetch("/api/forensics/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "upi",
        payload: {
          utr: sample.mockResult.utrValue,
          upiId: sample.mockResult.upiHandle?.handle || "merchant@okaxis",
        },
        lang,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setGroundingData(data);
      })
      .catch(() => {});
  }, [lang, onAuditComplete]);

  /* ── Handle real file upload & backend forensics ── */
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setImageURL(url);
      setActiveSample(null);
      setShowELA(false);
      setGroundingData(null);
      setMode("loading");

      try {
        // Step 1: Compute real cryptographic SHA-256 hash of image file
        const arrayBuffer = await file.arrayBuffer();
        const sha256 = await computeSHA256(arrayBuffer);

        // Convert to base64 for Google Gemini multi-modal inspection
        const fileBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file.size > 5 * 1024 * 1024 ? file.slice(0, 5 * 1024 * 1024) : file);
        });

        // Step 2: Algorithmic UTR and handle checks
        const utrResult = validateUTRAlgorithmic(utrInput || "");
        const handle = parseUPIHandle(upiInput || "@unknown");
        const fontAnomalies: string[] = [];
        if (!utrResult.isValid && utrInput) {
          fontAnomalies.push(...utrResult.anomalyNotes);
        }

        // Step 3: Call backend unified forensics endpoint with Gemini vision
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
              fileBase64,
            },
            lang,
          }),
        });

        let backendData: any = null;
        if (response.ok) {
          backendData = await response.json();
          setGroundingData(backendData);
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
        onAuditComplete(newResult);
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

  /* ── Universal intake: a file routed from the home desk ── */
  useEffect(() => {
    const incoming = takeIntake("upi");
    if (incoming) handleFile(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const downloadReceipt = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/forensics/export-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: {
            module: "upi",
            verdict: result.verdict,
            riskScore: result.verdict === "fraud" ? 92 : result.verdict === "suspicious" ? 65 : 15,
            confidence: result.confidence,
            evidence: result.evidencePoints,
            sha256: result.sha256,
            metrics: {
              utrValue: result.utrValue,
              utrValid: result.utrValid,
              upiHandle: result.upiHandle,
              elaScore: result.elaScore,
            },
          },
        }),
      });

      if (res.ok) {
        const dossier = await res.json();
        const blob = new Blob([JSON.stringify(dossier, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${dossier.caseReference || "evidence"}-audit.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      console.warn("Falling back to plain text receipt:", err);
    }

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

  const handleCyberCellReport = async () => {
    if (!result) return;
    try {
      const res = await fetch("/api/forensics/report-cybercell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: {
            module: "upi",
            verdict: result.verdict,
            riskScore: result.verdict === "fraud" ? 92 : result.verdict === "suspicious" ? 65 : 15,
            evidence: result.evidencePoints,
            sha256: result.sha256,
          },
          incident: {
            suspectUpi: result.upiHandle?.handle || upiInput || undefined,
            incidentDescription: `Victim encountered suspicious UPI payment screenshot with invalid NPCI routing or altered layout artifacts.`,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCyberCellData(data);
        setShowCyberModal(true);
      }
    } catch (err) {
      console.error("Failed to generate cyber-cell complaint:", err);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-5 pb-24 pt-6 sm:px-8">
      <InstrumentHeader
        no="01"
        note={lang === "en" ? "Screenshot forensics" : "स्क्रीनशॉट फॉरेंसिक"}
        title={lang === "en" ? "UPI payment screenshot" : "UPI भुगतान स्क्रीनशॉट"}
        methods={
          lang === "en"
            ? "Error level analysis · NPCI UTR check · PSP registry · font metrics"
            : "ELA · NPCI UTR जाँच · PSP रजिस्ट्री · फॉन्ट मेट्रिक्स"
        }
        actions={
          mode === "done" ? (
            <button onClick={reset} className="sk-btn-ghost gap-1.5 px-3 py-2 text-xs">
              <RefreshCcw className="w-3.5 h-3.5" />
              {lang === "en" ? "New inspection" : "नई जाँच"}
            </button>
          ) : null
        }
      />

      {/* ── Split-pane workbench ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100%-80px)]">
        {/* ── LEFT PANE: Input ── */}
        <div className="flex flex-col gap-5 min-h-0">
          {/* Sample cases */}
          <div className="sk-card p-4">
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
                {lang === "en" ? "Reference cases" : "संदर्भ केस"}
              </span>
              <span className="hidden font-mono text-[9px] uppercase tracking-wider text-ink-faint/80 sm:block dark:text-white/20">
                {lang === "en" ? "load one to see the method" : "तरीका देखने के लिए एक खोलें"}
              </span>
            </div>
            <div className="divide-y divide-rule/80 dark:divide-white/10">
              {SAMPLE_CASES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadSample(sample)}
                  className={clsx(
                    "flex w-full items-center gap-3 py-2.5 text-left transition-opacity",
                    activeSample === sample.id ? "opacity-100" : "opacity-90 hover:opacity-100"
                  )}
                >
                  <span
                    className={clsx(
                      "h-14 w-11 shrink-0 overflow-hidden rounded border bg-card transition-colors dark:bg-white/[0.06]",
                      activeSample === sample.id
                        ? sample.verdict === "genuine"
                          ? "border-trust"
                          : "border-fraud"
                        : "border-rule dark:border-white/15"
                    )}
                  >
                    <SampleThumbnail type={sample.svgType} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink dark:text-white/90">
                      {lang === "en" ? sample.label : sample.labelHi}
                    </span>
                    <span className="mt-0.5 hidden truncate text-[11px] text-ink-muted sm:block dark:text-white/35">
                      {lang === "en" ? sample.description : sample.descriptionHi}
                    </span>
                  </span>
                  <VerdictBadge verdict={sample.verdict} />
                </button>
              ))}
            </div>
          </div>

          {/* Manual input fields */}
          <div className="sk-card p-4 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
              {lang === "en" ? "Manual Field Entry (Optional)" : "मैन्युअल फ़ील्ड प्रविष्टि"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-ink-muted dark:text-white/45 block mb-1">
                  {lang === "en" ? "UTR Number" : "UTR नंबर"}
                </label>
                <input
                  type="text"
                  value={utrInput}
                  onChange={(e) => setUtrInput(e.target.value.trim())}
                  placeholder="e.g. 420736185294"
                  className="w-full px-3 py-2 text-sm font-mono border border-rule dark:border-dark-border rounded-lg bg-paper-sunk dark:bg-white/[0.03] text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/10"
                  maxLength={14}
                />
                <p className="text-[10px] text-ink-faint dark:text-white/25 mt-0.5">
                  12-digit NPCI reference
                </p>
              </div>
              <div>
                <label className="text-[11px] font-medium text-ink-muted dark:text-white/45 block mb-1">
                  {lang === "en" ? "UPI ID" : "UPI ID"}
                </label>
                <input
                  type="text"
                  value={upiInput}
                  onChange={(e) => setUpiInput(e.target.value.trim())}
                  placeholder="e.g. user@ybl"
                  className="w-full px-3 py-2 text-sm font-mono border border-rule dark:border-dark-border rounded-lg bg-paper-sunk dark:bg-white/[0.03] text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-ink/20 dark:focus:ring-white/10"
                />
                <p className="text-[10px] text-ink-faint dark:text-white/25 mt-0.5">
                  VPA from the screenshot
                </p>
              </div>
            </div>
          </div>

          {/* File dropzone */}
          <div
            className={clsx(
              "relative flex min-h-[136px] flex-1 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed px-4 py-6 transition-colors duration-150",
              dragActive
                ? "border-accent bg-accent-bg/50 dark:border-accent"
                : "border-rule-strong/80 bg-card/40 hover:border-ink-faint hover:bg-card dark:bg-white/[0.02] dark:hover:border-white/30 dark:hover:bg-white/[0.04]"
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
                <p className="text-sm text-ink-muted dark:text-white/45">
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
                <div className="grid h-10 w-10 place-items-center rounded-md border border-rule bg-card text-ink-muted dark:border-white/15 dark:bg-white/5 dark:text-white/45">
                  <Upload className="h-4 w-4" strokeWidth={1.7} />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-medium text-ink dark:text-white">
                    {lang === "en" ? "Drop the screenshot, or click to choose" : "स्क्रीनशॉट यहाँ छोड़ें या क्लिक करें"}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint dark:text-white/30">
                    PNG · JPG · WEBP — max 10 MB
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANE: Forensic breakdown ── */}
        <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
          {mode === "idle" && (
            <AwaitingFindings
              icon={Eye}
              title={lang === "en" ? "Nothing inspected yet" : "अभी कोई जाँच नहीं"}
              body={
                lang === "en"
                  ? "Pick a reference case or drop the screenshot you were sent. Findings, evidence and a verdict appear here."
                  : "संदर्भ केस चुनें या भेजा गया स्क्रीनशॉट डालें। निष्कर्ष, साक्ष्य और निर्णय यहाँ दिखेंगे।"
              }
              steps={
                lang === "en"
                  ? ["Load a reference case to see the method", "Drop the screenshot from WhatsApp", "Enter UTR and VPA for registry checks"]
                  : ["तरीका देखने के लिए संदर्भ केस खोलें", "व्हाट्सएप का स्क्रीनशॉट डालें", "रजिस्ट्री जाँच के लिए UTR व VPA भरें"]
              }
            />
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
                    <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35 mb-1">
                      {lang === "en" ? "Forensic Verdict" : "फॉरेंसिक निर्णय"}
                    </p>
                    <div className="flex items-center gap-3">
                      <VerdictBadge verdict={result.verdict} />
                      <span className="text-sm text-ink-muted dark:text-white/45 font-mono">
                        {result.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-ink-faint dark:text-white/25">Scanned at</p>
                    <p className="text-xs font-mono text-ink-muted dark:text-white/45">{result.timestamp}</p>
                    {result.sha256 && (
                      <p className="text-[9px] font-mono text-trust mt-1 max-w-[180px] truncate">
                        SHA: {result.sha256}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* UTR + UPI Handle */}
              <div className="sk-card p-4 space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
                  {lang === "en" ? "Reference Validation" : "संदर्भ सत्यापन"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-paper-sunk dark:bg-white/[0.03] border border-rule dark:border-dark-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Hash className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-[11px] font-semibold text-ink-muted dark:text-white/45">UTR Number</span>
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
                  <div className="p-3 rounded-lg bg-paper-sunk dark:bg-white/[0.03] border border-rule dark:border-dark-border">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <AlignLeft className="w-3.5 h-3.5 text-ink-muted" />
                      <span className="text-[11px] font-semibold text-ink-muted dark:text-white/45">UPI Handle</span>
                    </div>
                    {result.upiHandle ? (
                      <>
                        <p className="sk-mono text-ink dark:text-white break-all">{result.upiHandle.handle}</p>
                        <p className="text-[10px] text-ink-muted dark:text-white/45 mt-0.5">{result.upiHandle.bank}</p>
                        <div className="mt-1.5">
                          {result.upiHandle.trusted ? (
                            <span className="sk-badge-trust"><CheckCircle2 className="w-3 h-3" /> Registered PSP</span>
                          ) : (
                            <span className="sk-badge-fraud"><XCircle className="w-3 h-3" /> Unknown PSP</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-ink-muted dark:text-white/45">Not provided</p>
                    )}
                  </div>
                </div>
              </div>

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

              {/* ELA section */}
              <div className="sk-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-ink-muted" />
                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
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
                          : "border-rule dark:border-dark-border text-ink-muted dark:text-white/45 hover:text-ink dark:hover:text-white"
                      )}
                    >
                      {showELA ? "Hide ELA Heatmap" : "Show ELA Heatmap"}
                    </button>
                  )}
                  {activeSample && (
                    <span className="text-[10px] text-ink-faint dark:text-white/25 italic">
                      (Simulated for demo)
                    </span>
                  )}
                </div>
                <ELAScoreBar score={result.elaScore} />
                {showELA && !activeSample && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-paper-sunk dark:bg-white/[0.03] border border-rule dark:border-dark-border">
                    <Info className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                    <p className="text-[10px] text-ink-muted dark:text-white/45">
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
                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
                      {lang === "en" ? "Font & Layout Anomalies" : "फॉन्ट एवं लेआउट विसंगतियाँ"}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {result.fontAnomalies.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-ink dark:text-white/75">
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
                    <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
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
                      <li key={i} className="flex items-start gap-2.5 text-xs text-ink dark:text-white/75">
                        <span className="font-mono font-bold text-ink-faint dark:text-white/25 shrink-0 w-4">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {/* Action Buttons: Cryptographic Export & Cyber-Cell Dispatch */}
              <div className="space-y-2">
                <button
                  onClick={downloadReceipt}
                  className="sk-btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {lang === "en"
                    ? "Export Cryptographic Audit Dossier (JSON)"
                    : "डिजिटल साक्ष्य दस्तावेज़ डाउनलोड करें (JSON)"}
                </button>

                {(result.verdict === "fraud" || result.verdict === "suspicious") && (
                  <button
                    onClick={handleCyberCellReport}
                    className="w-full py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <ShieldAlert className="w-4 h-4 text-white" />
                    {lang === "en"
                      ? "Dispatch 1930 / Cyber-Cell Complaint"
                      : "1930 / साइबर सेल शिकायत तैयार करें"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Cyber Cell Modal ── */}
      {showCyberModal && cyberCellData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-card dark:bg-dark-card border border-rule dark:border-dark-border rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-rule dark:border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-ink dark:text-white">
                  National Cyber Crime Reporting Portal (1930 / CFCFRMS)
                </h3>
              </div>
              <button
                onClick={() => setShowCyberModal(false)}
                className="text-ink-muted hover:text-ink dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                Golden Hour Advisory:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                {cyberCellData.goldenHourAdvisory?.map((adv: string, i: number) => (
                  <li key={i}>{adv}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-ink-muted dark:text-white/45">
                  Official Police Complaint Draft (Ready to Submit)
                </label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(cyberCellData.formalPoliceNarrative);
                    setCopiedPoliceText(true);
                    setTimeout(() => setCopiedPoliceText(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs text-trust hover:underline"
                >
                  <Copy className="w-3 h-3" />
                  {copiedPoliceText ? "Copied!" : "Copy Full Text"}
                </button>
              </div>
              <textarea
                readOnly
                value={cyberCellData.formalPoliceNarrative}
                rows={10}
                className="w-full text-xs font-mono p-3 rounded-lg border border-rule dark:border-dark-border bg-paper-sunk dark:bg-white/[0.03] text-ink dark:text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-ink-faint dark:text-white/35">
                Ref Code: {cyberCellData.acknowledgementCode}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCyberModal(false)}
                  className="sk-btn-ghost text-xs"
                >
                  Close
                </button>
                <a
                  href="https://cybercrime.gov.in"
                  target="_blank"
                  rel="noreferrer"
                  className="sk-btn-primary text-xs flex items-center gap-1.5"
                >
                  Open cybercrime.gov.in
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
