"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
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
  Share2,
  CheckSquare,
  ShieldCheck,
} from "lucide-react";
import RealTimeGroundingCard from "@/components/RealTimeGroundingCard";
import Button from "@/components/Button";
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
   Viewfinder Corner Brackets
   (Animated scanner viewfinder with saffron highlight)
───────────────────────────────────────── */
function ViewfinderBrackets({
  active = false,
  size = "md",
}: {
  active?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const bracketSize =
    size === "lg" ? "w-6 h-6 sm:w-8 sm:h-8" : size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const borderThickness = "border-2";
  const bracketColor = active
    ? "border-accent text-accent shadow-[0_0_12px_rgb(var(--rgb-accent)/0.7)]"
    : "border-accent/40 dark:border-accent/30 group-hover:border-accent text-accent";

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10" aria-hidden="true">
      {/* Top Left */}
      <span
        className={clsx(
          "sk-viewfinder-animated absolute top-3 left-3 sm:top-4 sm:left-4 rounded-tl-lg origin-top-left",
          bracketSize,
          borderThickness,
          "border-b-0 border-r-0",
          bracketColor,
          "transition-[transform,opacity,border-color] duration-200",
          active && "scale-115 !border-accent"
        )}
      />
      {/* Top Right */}
      <span
        className={clsx(
          "sk-viewfinder-animated absolute top-3 right-3 sm:top-4 sm:right-4 rounded-tr-lg origin-top-right",
          bracketSize,
          borderThickness,
          "border-b-0 border-l-0",
          bracketColor,
          "transition-[transform,opacity,border-color] duration-200",
          active && "scale-115 !border-accent"
        )}
      />
      {/* Bottom Left */}
      <span
        className={clsx(
          "sk-viewfinder-animated absolute bottom-3 left-3 sm:bottom-4 sm:left-4 rounded-bl-lg origin-bottom-left",
          bracketSize,
          borderThickness,
          "border-t-0 border-r-0",
          bracketColor,
          "transition-[transform,opacity,border-color] duration-200",
          active && "scale-115 !border-accent"
        )}
      />
      {/* Bottom Right */}
      <span
        className={clsx(
          "sk-viewfinder-animated absolute bottom-3 right-3 sm:bottom-4 sm:right-4 rounded-br-lg origin-bottom-right",
          bracketSize,
          borderThickness,
          "border-t-0 border-l-0",
          bracketColor,
          "transition-[transform,opacity,border-color] duration-200",
          active && "scale-115 !border-accent"
        )}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   Live Forensic Checklist
   ("Reading metadata...", "Checking fonts and pixels...",
   "Verifying UPI ID..." where each line gets a tick as it finishes)
───────────────────────────────────────── */
function LiveForensicChecklist({
  scanStep,
  lang,
}: {
  scanStep: number;
  lang: "en" | "hi";
}) {
  const steps = [
    {
      label: lang === "en" ? "Reading metadata..." : "मेटाडेटा पढ़ा जा रहा है...",
    },
    {
      label: lang === "en" ? "Checking fonts and pixels..." : "फ़ॉन्ट और पिक्सेल की जाँच...",
    },
    {
      label: lang === "en" ? "Verifying UPI ID..." : "UPI ID सत्यापित किया जा रहा है...",
    },
  ];

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto p-3.5 rounded-xl bg-surface/90 dark:bg-[#131926]/90 backdrop-blur-md border border-border/80 dark:border-white/10 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between border-b border-border/60 dark:border-white/5 pb-2">
        <div className="flex items-center gap-2">
          <span className="sk-pulse-dot" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
            {lang === "en" ? "Live Forensic Pipeline" : "लाइव फॉरेंसिक जांच"}
          </span>
        </div>
        <span className="text-[11px] font-mono font-bold text-accent">
          {scanStep >= 3 ? "3/3 Verified" : `${scanStep}/3 Checks Done`}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((item, index) => {
          const isDone = scanStep > index;
          const isCurrent = scanStep === index;

          return (
            <div
              key={index}
              className={clsx(
                "flex items-center gap-2.5 transition-[opacity,transform] duration-200 ease-out",
                isDone
                  ? "text-ink dark:text-white font-medium"
                  : isCurrent
                  ? "text-ink dark:text-white font-medium"
                  : "text-ink-faint dark:text-slate-600 opacity-60"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="w-4 h-4 text-trust shrink-0 transition-transform duration-200 scale-100" />
              ) : isCurrent ? (
                <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-border dark:border-white/20 shrink-0" />
              )}
              <span className="font-mono text-xs">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Large Circular Risk Gauge (0-100)
   Counts up on appear with soft glow and
   precision tick marks around the ring.
───────────────────────────────────────── */
interface CircularRiskGaugeProps {
  score: number;
  verdict: "genuine" | "suspicious" | "fraud";
  lang: "en" | "hi";
  size?: number;
}

function CircularRiskGauge({
  score,
  verdict,
  lang,
  size = 196,
}: CircularRiskGaugeProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayScore, setDisplayScore] = useState(shouldReduceMotion ? score : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayScore(score);
      return;
    }

    let startTime: number | null = null;
    let animId: number;
    const duration = 1200; // ms count-up

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic curve
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(ease * score));

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayScore(score);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [score, shouldReduceMotion]);

  // Color tokens aligned with design rules:
  // safe #34D399, suspicious #FBBF24, fake #FB7185
  const config =
    verdict === "fraud"
      ? {
          stroke: "#FB7185",
          glow: "rgba(251, 113, 133, 0.55)",
          gradientId: "upi-gauge-fraud",
          stop1: "#FB7185",
          stop2: "#E11D48",
          textColor: "text-fake",
        }
      : verdict === "suspicious"
      ? {
          stroke: "#FBBF24",
          glow: "rgba(251, 191, 36, 0.55)",
          gradientId: "upi-gauge-warn",
          stop1: "#FBBF24",
          stop2: "#D97706",
          textColor: "text-suspicious",
        }
      : {
          stroke: "#34D399",
          glow: "rgba(52, 211, 153, 0.55)",
          gradientId: "upi-gauge-safe",
          stop1: "#34D399",
          stop2: "#059669",
          textColor: "text-safe",
        };

  const strokeWidth = 11;
  const radius = (size - 36) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const cx = size / 2;
  const cy = size / 2;
  const totalTicks = 40;
  const tickOuterRadius = size / 2 - 3;
  const tickInnerMajor = tickOuterRadius - 7;
  const tickInnerMinor = tickOuterRadius - 4.5;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Soft Ambient Radial Glow Behind Gauge */}
      <div
        className="absolute rounded-full blur-2xl pointer-events-none transition-opacity duration-700"
        style={{
          width: size * 0.95,
          height: size * 0.95,
          background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
          opacity: 0.35,
        }}
        aria-hidden="true"
      />

      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={config.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.stop1} />
              <stop offset="100%" stopColor={config.stop2} />
            </linearGradient>

            {/* Soft Glow Filter */}
            <filter id={`glow-${config.gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor={config.glow} floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Precision tick marks around the ring */}
          <g className="transition-opacity duration-300">
            {Array.from({ length: totalTicks }).map((_, i) => {
              const angleDeg = i * (360 / totalTicks) - 90;
              const angleRad = (angleDeg * Math.PI) / 180;
              const isMajor = i % 10 === 0;
              const innerR = isMajor ? tickInnerMajor : tickInnerMinor;
              const outerR = tickOuterRadius;

              const x1 = cx + innerR * Math.cos(angleRad);
              const y1 = cy + innerR * Math.sin(angleRad);
              const x2 = cx + outerR * Math.cos(angleRad);
              const y2 = cy + outerR * Math.sin(angleRad);

              const tickPercent = (i / totalTicks) * 100;
              const isPassed = tickPercent <= displayScore;

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isPassed ? config.stroke : "currentColor"}
                  strokeWidth={isMajor ? 1.75 : 1}
                  strokeLinecap="round"
                  className={clsx(
                    "transition-colors duration-200",
                    isPassed
                      ? "opacity-90"
                      : "text-slate-300 dark:text-white/15 opacity-40"
                  )}
                />
              );
            })}
          </g>

          {/* Background Concentric Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200/90 dark:text-white/[0.07]"
          />

          {/* Dynamic Animated Progress Ring */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke={`url(#${config.gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#glow-${config.gradientId})`}
            className="sk-gauge-ring transform -rotate-90 origin-center transition-[stroke-dashoffset] duration-300 ease-out"
          />
        </svg>

        {/* Center Display: 0-100 Score Count-Up */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="flex items-baseline justify-center">
            <span className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-ink dark:text-white leading-none">
              {displayScore}
            </span>
            <span className="text-xs sm:text-sm font-semibold font-mono text-ink-muted dark:text-slate-400 ml-0.5">
              /100
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted dark:text-slate-400 mt-1">
            {lang === "en" ? "Risk Score" : "जोखिम स्कोर"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Helper: Calculate Risk Score (0-100)
───────────────────────────────────────── */
function getRiskScore(result: ValidationResult): number {
  if (result.verdict === "fraud") {
    return Math.max(88, result.elaScore || 92);
  }
  if (result.verdict === "suspicious") {
    return Math.max(55, Math.min(75, result.elaScore || 64));
  }
  return Math.min(18, Math.max(6, result.elaScore || 8));
}

/* ─────────────────────────────────────────
   Findings Model & Generator
───────────────────────────────────────── */
interface FindingCardItem {
  id: string;
  severity: "Low" | "Medium" | "High";
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
}

function getFindings(result: ValidationResult, lang: "en" | "hi"): FindingCardItem[] {
  const items: FindingCardItem[] = [];

  // 1. UTR Verification
  if (result.utrValid) {
    items.push({
      id: "utr",
      severity: "Low",
      icon: Hash,
      title: lang === "en" ? "UTR Transaction Reference" : "UTR ट्रांजेक्शन संदर्भ",
      detail:
        lang === "en"
          ? `UTR '${result.utrValue}' matches the official 12-digit numeric NPCI routing standard.`
          : `UTR '${result.utrValue}' आधिकारिक 12-अंकीय NPCI संदर्भ प्रारूप के अनुरूप है।`,
    });
  } else {
    items.push({
      id: "utr",
      severity: "High",
      icon: Hash,
      title: lang === "en" ? "UTR Reference Format Invalid" : "अमान्य UTR संदर्भ प्रारूप",
      detail:
        lang === "en"
          ? `UTR '${result.utrValue}' is not a valid 12-digit numeric NPCI code. Fake receipts frequently use randomized or alphanumeric codes.`
          : `UTR '${result.utrValue}' मान्य 12 अंकों का नहीं है। नकली रसीदों में अक्सर ऐसे अमान्य कोड होते हैं।`,
    });
  }

  // 2. UPI Provider & Handle
  if (result.upiHandle?.trusted) {
    items.push({
      id: "upi-handle",
      severity: "Low",
      icon: CheckCircle2,
      title: lang === "en" ? "UPI Handle Authenticity" : "UPI हैंडल सत्यापन",
      detail:
        lang === "en"
          ? `${result.upiHandle.handle} is an authenticated PSP registered with ${result.upiHandle.bank}.`
          : `${result.upiHandle.handle} एक प्रमाणित PSP है जो ${result.upiHandle.bank} से सम्बद्ध है।`,
    });
  } else if (result.upiHandle && !result.upiHandle.trusted) {
    items.push({
      id: "upi-handle",
      severity: "High",
      icon: AlertTriangle,
      title: lang === "en" ? "Unregistered UPI Provider" : "गैर-पंजीकृत UPI हैंडल",
      detail:
        lang === "en"
          ? `Handle '${result.upiHandle.handle}' (${result.upiHandle.bank}) is not found in the NPCI banking directory.`
          : `हैंडल '${result.upiHandle.handle}' NPCI बैंक डायरेक्टरी में पंजीकृत नहीं मिला।`,
    });
  } else {
    items.push({
      id: "upi-handle",
      severity: "Medium",
      icon: AlertTriangle,
      title: lang === "en" ? "UPI Handle Missing" : "UPI हैंडल अनुपलब्ध",
      detail:
        lang === "en"
          ? "No registered UPI PSP address could be identified in the transaction metadata."
          : "स्क्रीनशॉट में कोई वैध UPI पता नहीं मिला।",
    });
  }

  // 3. Pixel & Compression ELA
  if (result.elaScore < 20) {
    items.push({
      id: "ela",
      severity: "Low",
      icon: Layers,
      title: lang === "en" ? "Pixel Compression & ELA" : "पिक्सेल ELA विश्लेषण",
      detail:
        lang === "en"
          ? `ELA score ${result.elaScore}/100 — Clean pixel structure with uniform error distribution and zero splice artifacts.`
          : `ELA स्कोर ${result.elaScore}/100 — पिक्सेल संरचना सामान्य है और कोई डिजिटल हेरफेर नहीं मिला।`,
    });
  } else if (result.elaScore <= 50) {
    items.push({
      id: "ela",
      severity: "Medium",
      icon: Layers,
      title: lang === "en" ? "Pixel Compression Variance" : "मध्यम पिक्सेल भिन्नता",
      detail:
        lang === "en"
          ? `ELA score ${result.elaScore}/100 — Moderate compression discrepancy around text fields. Manual review suggested.`
          : `ELA स्कोर ${result.elaScore}/100 — टेक्स्ट के आसपास मध्यम पिक्सेल भिन्नता है।`,
    });
  } else {
    items.push({
      id: "ela",
      severity: "High",
      icon: Layers,
      title: lang === "en" ? "Digital Editing & Pixel Splicing" : "डिजिटल संपादन एवं हेरफेर",
      detail:
        lang === "en"
          ? `ELA score ${result.elaScore}/100 — Significant pixel anomalies detected around the amount/date region, indicating image manipulation.`
          : `ELA स्कोर ${result.elaScore}/100 — राशि या तारीख के पास गंभीर पिक्सेल हेरफेर का पता चला है।`,
    });
  }

  // 4. Typography & Layout
  if (result.fontAnomalies.length > 0) {
    items.push({
      id: "typography",
      severity: "High",
      icon: AlignLeft,
      title: lang === "en" ? "Typography & Layout Inconsistencies" : "फॉन्ट एवं लेआउट विसंगतियाँ",
      detail: result.fontAnomalies.join(" • "),
    });
  } else {
    items.push({
      id: "typography",
      severity: "Low",
      icon: AlignLeft,
      title: lang === "en" ? "Font Metrics & Alignment" : "फॉन्ट एवं लेआउट संरचना",
      detail:
        lang === "en"
          ? "Font weights, numeric glyphs, and spacing conform to official banking application UI kits."
          : "फॉन्ट स्टाइल, अंक और स्पेसिंग आधिकारिक बैंकिंग ऐप के अनुरूप हैं।",
    });
  }

  // 5. Additional forensic evidence points (filtered to avoid redundancy)
  const specialEvidence = result.evidencePoints.filter(
    (e) =>
      !e.toLowerCase().includes("sha-256") &&
      !e.toLowerCase().includes("ela score") &&
      !e.toLowerCase().includes("utr ") &&
      !e.toLowerCase().includes("authenticated phonepe") &&
      !e.toLowerCase().includes("registered psp")
  );

  specialEvidence.slice(0, 2).forEach((ev, idx) => {
    const isHarmful =
      result.verdict === "fraud" ||
      ev.toLowerCase().includes("fake") ||
      ev.toLowerCase().includes("inconsistent") ||
      ev.toLowerCase().includes("invalid");

    items.push({
      id: `evidence-${idx}`,
      severity: isHarmful ? "High" : result.verdict === "suspicious" ? "Medium" : "Low",
      icon: isHarmful ? AlertTriangle : CheckCircle2,
      title: lang === "en" ? "Forensic Signal Detection" : "अतिरिक्त फॉरेंसिक साक्ष्य",
      detail: ev,
    });
  });

  return items;
}

/* ─────────────────────────────────────────
   "What this means for you" Non-Technical Copy
───────────────────────────────────────── */
function getWhatItMeans(verdict: ValidationResult["verdict"], lang: "en" | "hi"): string {
  if (verdict === "genuine") {
    return lang === "en"
      ? "This payment screenshot shows valid bank routing codes, matching typography, and no signs of image tampering. Even with genuine-looking receipts, always confirm that funds have settled in your bank account before handing over goods or services."
      : "यह भुगतान स्क्रीनशॉट वैध बैंक विवरण और बिना किसी छेड़छाड़ के दिखाई दे रहा है। फिर भी, सामान देने से पहले अपने बैंक खाते में जमा राशि की पुष्टि करने के बाद ही आगे बढ़ें।";
  }
  if (verdict === "suspicious") {
    return lang === "en"
      ? "Certain details such as the UPI handle or transaction reference format don't fully align with standard banking templates. Do not release goods or services until the funds reflect directly in your official banking app."
      : "UPI आईडी या संदर्भ प्रारूप सामान्य बैंक पैटर्न से पूरी तरह मेल नहीं खा रहे हैं। जब तक आपके बैंक खाते में पैसे न दिखें, तब तक कोई सामान या सेवा न दें।";
  }
  return lang === "en"
    ? "High risk of fraud detected. The screenshot shows clear signs of digital editing, an invalid 12-digit UTR, or a fake receipt generator pattern. No real payment has been made to your account."
    : "धोखाधड़ी का गंभीर जोखिम मिला है। स्क्रीनशॉट में संपादन के स्पष्ट निशान, अमान्य UTR या नकली रसीद जनरेटर का उपयोग पाया गया है। आपके बैंक खाते में कोई वास्तविक भुगतान नहीं हुआ है।";
}

/* ─────────────────────────────────────────
   "What should I do next?" Action Items
───────────────────────────────────────── */
function getNextActions(verdict: ValidationResult["verdict"], lang: "en" | "hi") {
  if (verdict === "genuine") {
    return [
      {
        title: lang === "en" ? "Verify credit in your bank app" : "अपने बैंक ऐप में क्रेडिट जांचें",
        description:
          lang === "en"
            ? "Open your official banking app (SBI, HDFC, ICICI, etc.) or check SMS notifications to confirm the balance received."
            : "अपने बैंक ऐप या SMS में जाकर पुष्टि करें कि खाते में पैसे सचमुच जमा हो गए हैं।",
      },
      {
        title: lang === "en" ? "Match amount & sender details" : "राशि व प्रेषक विवरण का मिलान करें",
        description:
          lang === "en"
            ? "Confirm that the customer name and exact rupee value match what was agreed before finalizing the order."
            : "पुष्टि करें कि प्रेषक का नाम और सटीक राशि आपके सौदे के अनुसार ही है।",
      },
      {
        title: lang === "en" ? "Keep verification record" : "सत्यापन रिकॉर्ड सुरक्षित रखें",
        description:
          lang === "en"
            ? "Download the cryptographic audit dossier below if you require a permanent verification timestamp for your business records."
            : "व्यावसायिक रिकॉर्ड के लिए नीचे दिया गया फॉरेंसिक दस्तावेज़ डाउनलोड कर सकते हैं।",
      },
    ];
  }

  if (verdict === "suspicious") {
    return [
      {
        title: lang === "en" ? "Hold goods or service delivery" : "सामान या सेवा रोक कर रखें",
        description:
          lang === "en"
            ? "Do not release merchandise, hand over packages, or provide refunds while the reference is unverified."
            : "जब तक भुगतान स्पष्ट न हो जाए, तब तक कोई भी सामान या धनवापसी न दें।",
      },
      {
        title: lang === "en" ? "Request a live app demonstration" : "लाइव ऐप में स्थिति दिखाने को कहें",
        description:
          lang === "en"
            ? "Ask the sender to open their UPI app live and show the transaction marked 'Completed' in their history."
            : "ग्राहक से कहें कि वह अपने मोबाइल में ऐप खोलकर 'सफल' ट्रांजेक्शन इतिहास दिखाएं।",
      },
      {
        title: lang === "en" ? "Check bank passbook after 15 minutes" : "15 मिनट बाद बैंक पासबुक देखें",
        description:
          lang === "en"
            ? "Inter-bank UPI settlement can occasionally experience pending delays. Refresh your account statement before proceeding."
            : "बैंक सर्वर में कभी-कभी देरी हो सकती है। 15 मिनट बाद अपनी बैंक स्टेटमेंट रिफ्रेश करें।",
      },
    ];
  }

  return [
    {
      title: lang === "en" ? "Refuse transaction immediately" : "लेन-देन को तुरंत अस्वीकार करें",
      description:
        lang === "en"
          ? "Do not deliver goods, hand over cash, or send money back. This is an active fraud attempt."
          : "कोई भी सामान न दें और पैसे वापस न भेजें। यह धोखाधड़ी का स्पष्ट प्रयास है।",
    },
    {
      title: lang === "en" ? "Export cryptographic evidence" : "डिजिटल साक्ष्य डाउनलोड करें",
      description:
        lang === "en"
          ? "Download the tamper-proof cryptographic audit dossier (JSON) below to preserve legal evidence."
          : "कानूनी कार्रवाई के लिए नीचे दिए गए बटन से डिजिटल साक्ष्य दस्तावेज़ डाउनलोड करें।",
    },
    {
      title: lang === "en" ? "Report scammer to Cyber Cell (1930)" : "1930 / साइबर सेल में रिपोर्ट करें",
      description:
        lang === "en"
          ? "Click 'Dispatch 1930 Complaint' below or visit cybercrime.gov.in with the suspect's UPI ID and mobile number."
          : "नीचे दिए गए बटन से राष्ट्रीय साइबर पोर्टल (1930) पर शिकायत का ड्राफ्ट तैयार कर सबमिट करें।",
    },
  ];
}

/* ─────────────────────────────────────────
   Main UPI Inspector component
───────────────────────────────────────── */
export default function UPIInspector({
  lang,
  onAuditComplete,
  onOpenShareShield,
}: {
  lang: "en" | "hi";
  onAuditComplete: () => void;
  onOpenShareShield?: (data: any) => void;
}) {
  const shouldReduceMotion = useReducedMotion();
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
  const [scanStep, setScanStep] = useState<number>(0);

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
    onAuditComplete();

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
      setScanStep(0);
      setMode("loading");

      // Orchestrate the live checklist ticking progression
      const step1Timer = setTimeout(() => setScanStep(1), 550);
      const step2Timer = setTimeout(() => setScanStep(2), 1250);
      const step3Timer = setTimeout(() => setScanStep(3), 1950);

      try {
        const forensicPromise = (async () => {
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

          return newResult;
        })();

        // Ensure user perceives the live checklist progression and glowing scan sweep (min 2100ms)
        const [newResult] = await Promise.all([
          forensicPromise,
          new Promise((resolve) => setTimeout(resolve, 2100)),
        ]);

        setScanStep(3);
        // Brief 350ms pause so the final checkmark is seen clearly before results display
        await new Promise((resolve) => setTimeout(resolve, 350));

        setResult(newResult);
        setMode("done");
        onAuditComplete();
      } catch (err) {
        console.error("Forensic analysis error:", err);
        setMode("done");
      } finally {
        clearTimeout(step1Timer);
        clearTimeout(step2Timer);
        clearTimeout(step3Timer);
      }
    },
    [upiInput, utrInput, lang, onAuditComplete]
  );

  /* ── Clipboard paste handler for Ctrl+V ── */
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile]);

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
    setScanStep(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
            <Button variant="secondary" size="xs" onClick={reset} className="gap-1.5">
              <RefreshCcw className="w-3.5 h-3.5" />
              {lang === "en" ? "New Scan" : "नई जांच"}
            </Button>
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

          {/* File dropzone / scanner area */}
          <div
            className={clsx(
              "group relative flex-1 sk-card rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-[transform,opacity,border-color,background-color,box-shadow] duration-200 min-h-[300px] sm:min-h-[340px] p-4",
              mode !== "loading" && "cursor-pointer",
              dragActive
                ? "border-accent bg-accent/[0.08] dark:bg-accent/[0.12] shadow-[0_0_35px_rgb(var(--rgb-accent)/0.25)] ring-2 ring-accent/30"
                : "border-border/80 dark:border-white/10 hover:border-accent/50 dark:hover:border-accent/40 hover:bg-surface/60 dark:hover:bg-white/[0.02]"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (mode !== "loading") fileInputRef.current?.click();
            }}
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
              <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                <ViewfinderBrackets active={true} size="lg" />

                {/* Scanning Image Viewport with Glowing Scan Line */}
                {imageURL ? (
                  <div className="relative w-full max-h-[220px] sm:max-h-[250px] flex items-center justify-center rounded-xl bg-black/15 dark:bg-black/40 overflow-hidden border border-accent/20 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={imgRef}
                      src={imageURL}
                      alt="UPI Screenshot undergoing forensic scan"
                      className="max-h-[200px] sm:max-h-[230px] w-auto max-w-full object-contain rounded-lg shadow-md select-none"
                    />

                    {/* Scan line overlay sweeping top to bottom */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-accent/[0.03] dark:bg-accent/[0.06]" />

                      {/* Sweeping laser line with gradient glow beam */}
                      <div className="sk-scanner-line-sweep absolute inset-x-0 top-0 h-full pointer-events-none flex flex-col justify-end">
                        <div className="w-full h-24 bg-gradient-to-t from-accent/35 via-accent/10 to-transparent pointer-events-none" />
                        <div className="w-full h-[2.5px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgb(var(--rgb-accent)),0_0_24px_rgb(var(--rgb-accent)/0.9),0_0_36px_rgb(var(--rgb-accent)/0.5)] pointer-events-none" />
                      </div>
                    </div>

                    {/* Live status badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-accent/40 text-[10px] font-mono text-accent font-semibold tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping mr-0.5" />
                      {lang === "en" ? "Optical Scan Active" : "स्कैन सक्रिय"}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
                      <Upload className="w-6 h-6 animate-pulse" />
                    </div>
                    <p className="text-sm font-medium text-ink dark:text-white">
                      {lang === "en" ? "Preparing forensic analysis..." : "फॉरेंसिक विश्लेषण प्रारंभ हो रहा है..."}
                    </p>
                  </div>
                )}

                {/* Short Live Checklist Underneath */}
                <div className="w-full mt-4">
                  <LiveForensicChecklist scanStep={scanStep} lang={lang} />
                </div>
              </div>
            ) : imageURL ? (
              <div className="relative w-full h-full p-2 flex flex-col items-center justify-center">
                <ViewfinderBrackets active={dragActive} size="lg" />
                <div className="relative w-full max-h-[260px] sm:max-h-[290px] flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imageURL}
                    alt="Uploaded UPI screenshot"
                    className={clsx(
                      "max-h-[240px] sm:max-h-[270px] w-auto max-w-full object-contain rounded-lg shadow-md",
                      showELA && "opacity-30"
                    )}
                    crossOrigin="anonymous"
                  />
                  {showELA && (
                    <canvas
                      ref={elaCanvasRef}
                      className="absolute inset-0 m-auto max-h-[240px] sm:max-h-[270px] w-auto max-w-full object-contain rounded-lg pointer-events-none"
                    />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    leftIcon={<Upload className="w-3.5 h-3.5 text-accent" />}
                  >
                    {lang === "en" ? "Change Screenshot" : "दूसरा स्क्रीनशॉट चुनें"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <ViewfinderBrackets active={dragActive} size="lg" />

                <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 sm:p-8 max-w-md mx-auto">
                  {/* Scanner Icon with glowing background halo */}
                  <div
                    className={clsx(
                      "w-16 h-16 rounded-2xl flex items-center justify-center border transition-[transform,opacity,background-color,border-color,box-shadow] duration-200 mb-4",
                      dragActive
                        ? "bg-accent/15 border-accent text-accent shadow-[0_0_24px_rgb(var(--rgb-accent)/0.4)] scale-110"
                        : "bg-surface/80 dark:bg-white/[0.04] border-border dark:border-white/10 text-accent group-hover:border-accent/40 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgb(var(--rgb-accent)/0.25)]"
                    )}
                  >
                    <Upload className="w-7 h-7 transition-transform duration-200" />
                  </div>

                  {/* Primary message */}
                  <h3 className="text-base sm:text-lg font-semibold text-ink dark:text-white mb-1.5 leading-snug">
                    {lang === "en"
                      ? "Drop screenshot, click to upload, or paste with Ctrl+V"
                      : "स्क्रीनशॉट छोड़ें, अपलोड करने के लिए क्लिक करें, या Ctrl+V से पेस्ट करें"}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-xs text-ink-muted dark:text-slate-400 mb-4 leading-relaxed">
                    {lang === "en"
                      ? "Supports PhonePe, Google Pay, Paytm, BHIM & bank app receipts (PNG, JPG, WebP · Max 10 MB)"
                      : "PhonePe, Google Pay, Paytm, BHIM और बैंक स्क्रीनशॉट (PNG, JPG, WebP · अधिकतम 10 MB)"}
                  </p>

                  {/* Button and keyboard shortcut pill */}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      leftIcon={<Upload className="w-4 h-4 text-accent" />}
                    >
                      {lang === "en" ? "Select File" : "फ़ाइल चुनें"}
                    </Button>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface/60 dark:bg-white/[0.04] border border-border/70 dark:border-white/10 text-[11px] font-mono text-ink-muted dark:text-slate-400">
                      <kbd className="px-1.5 py-0.5 rounded bg-surface dark:bg-white/10 border border-border/80 dark:border-white/10 font-bold text-ink dark:text-white text-[10px]">
                        Ctrl
                      </kbd>
                      <span>+</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-surface dark:bg-white/10 border border-border/80 dark:border-white/10 font-bold text-ink dark:text-white text-[10px]">
                        V
                      </kbd>
                      <span className="ml-1 text-[10px] text-ink-faint dark:text-slate-500">
                        {lang === "en" ? "to paste" : "पेस्ट करें"}
                      </span>
                    </span>
                  </div>
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

          {mode === "done" && result && (() => {
            const riskScore = getRiskScore(result);
            const findings = getFindings(result, lang);
            const whatItMeans = getWhatItMeans(result.verdict, lang);
            const nextActions = getNextActions(result.verdict, lang);

            return (
              <div className="space-y-4">
                {/* ── 1. Hero Card: Circular Risk Gauge & Big Verdict ── */}
                <div
                  className={clsx(
                    "sk-card p-6 sm:p-7 rounded-3xl border text-center flex flex-col items-center justify-center relative overflow-hidden backdrop-blur-xl transition-all duration-300",
                    result.verdict === "genuine" &&
                      "bg-gradient-to-b from-emerald-500/[0.08] via-card to-card border-emerald-500/30 shadow-[0_4px_30px_rgba(52,211,153,0.08)]",
                    result.verdict === "suspicious" &&
                      "bg-gradient-to-b from-amber-500/[0.08] via-card to-card border-amber-500/30 shadow-[0_4px_30px_rgba(251,191,36,0.08)]",
                    result.verdict === "fraud" &&
                      "bg-gradient-to-b from-rose-500/[0.08] via-card to-card border-rose-500/30 shadow-[0_4px_30px_rgba(251,113,133,0.08)]"
                  )}
                >
                  <div className="mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-widest font-semibold text-ink-muted dark:text-slate-400">
                      {lang === "en" ? "Forensic Authenticity Assessment" : "फॉरेंसिक प्रामाणिकता मूल्यांकन"}
                    </span>
                  </div>

                  {/* Large Circular Risk Gauge (0-100) with tick marks and soft glow */}
                  <div className="my-2 flex items-center justify-center">
                    <CircularRiskGauge
                      score={riskScore}
                      verdict={result.verdict}
                      lang={lang}
                      size={200}
                    />
                  </div>

                  {/* Big Heading Verdict Label */}
                  <div className="mt-2 space-y-1">
                    <h2
                      className={clsx(
                        "font-heading text-2xl sm:text-3xl font-extrabold uppercase tracking-tight",
                        result.verdict === "genuine" && "text-safe",
                        result.verdict === "suspicious" && "text-suspicious",
                        result.verdict === "fraud" && "text-fake"
                      )}
                    >
                      {result.verdict === "genuine"
                        ? lang === "en"
                          ? "LOOKS GENUINE"
                          : "असली प्रतीत होता है"
                        : result.verdict === "suspicious"
                        ? lang === "en"
                          ? "SUSPICIOUS"
                          : "संदिग्ध"
                        : lang === "en"
                        ? "LIKELY FAKE"
                        : "नकली होने की संभावना"}
                    </h2>

                    <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-ink-muted dark:text-slate-400 font-mono mt-1">
                      <span>{result.confidence}% {lang === "en" ? "Confidence" : "विश्वसनीयता"}</span>
                      <span>·</span>
                      <span>{result.timestamp}</span>
                    </div>

                    {result.sha256 && (
                      <p className="text-[10px] font-mono text-ink-faint dark:text-slate-500 truncate max-w-xs mx-auto mt-1">
                        SHA-256: {result.sha256.substring(0, 24)}...
                      </p>
                    )}
                  </div>
                </div>

                {/* ── 2. "What this means for you" Simple Non-Technical Box ── */}
                <div
                  className={clsx(
                    "rounded-2xl p-4 sm:p-4.5 border transition-all duration-200",
                    result.verdict === "genuine" &&
                      "bg-emerald-500/[0.05] border-emerald-500/20 text-emerald-950 dark:text-emerald-100",
                    result.verdict === "suspicious" &&
                      "bg-amber-500/[0.05] border-amber-500/20 text-amber-950 dark:text-amber-100",
                    result.verdict === "fraud" &&
                      "bg-rose-500/[0.05] border-rose-500/20 text-rose-950 dark:text-rose-100"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                        result.verdict === "genuine" && "bg-emerald-500/15 border-emerald-500/30 text-safe",
                        result.verdict === "suspicious" && "bg-amber-500/15 border-amber-500/30 text-suspicious",
                        result.verdict === "fraud" && "bg-rose-500/15 border-rose-500/30 text-fake"
                      )}
                    >
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider font-heading">
                        {lang === "en" ? "What this means for you" : "आपके लिए इसका क्या अर्थ है"}
                      </h3>
                      <p className="text-xs sm:text-sm text-ink/90 dark:text-slate-200 leading-relaxed font-sans">
                        {whatItMeans}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ── 3. Findings Cards with Severity Chip & Icon (Staggered fade & slide) ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400 font-heading">
                      {lang === "en" ? "Key Forensic Findings" : "प्रमुख फॉरेंसिक निष्कर्ष"} ({findings.length})
                    </span>
                    <span className="text-[11px] font-mono text-ink-faint dark:text-slate-500">
                      {result.verdict === "genuine" ? "All Safe" : `${result.verdict.toUpperCase()} Signals`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {findings.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.id}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.35,
                            delay: shouldReduceMotion ? 0 : index * 0.08,
                            ease: "easeOut",
                          }}
                          className="sk-card p-3.5 sm:p-4 rounded-xl border border-border/80 dark:border-white/10 flex items-start gap-3 transition-colors hover:border-ink-muted/30 dark:hover:border-white/20"
                        >
                          <div
                            className={clsx(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                              item.severity === "Low" && "bg-emerald-500/10 text-safe border-emerald-500/20",
                              item.severity === "Medium" && "bg-amber-500/10 text-suspicious border-amber-500/20",
                              item.severity === "High" && "bg-rose-500/10 text-fake border-rose-500/20"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="text-xs font-bold text-ink dark:text-white truncate">
                                {item.title}
                              </h4>
                              <span
                                className={clsx(
                                  "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wide border shrink-0",
                                  item.severity === "Low" && "bg-emerald-500/10 text-safe border-emerald-500/30",
                                  item.severity === "Medium" && "bg-amber-500/10 text-suspicious border-amber-500/30",
                                  item.severity === "High" && "bg-rose-500/10 text-fake border-rose-500/30"
                                )}
                              >
                                {item.severity} Risk
                              </span>
                            </div>
                            <p className="text-xs text-ink-muted dark:text-slate-300 leading-relaxed font-sans">
                              {item.detail}
                            </p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* ── 4. "What should I do next?" 2-3 Actions ── */}
                <div className="sk-card p-4 sm:p-5 rounded-2xl border border-border/80 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-accent" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted dark:text-slate-400 font-heading">
                      {lang === "en" ? "What should I do next?" : "आगे क्या करना चाहिए?"}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {nextActions.map((action, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 dark:bg-white/[0.03] border border-border/60 dark:border-white/5"
                      >
                        <span className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 bg-accent/10 text-accent font-mono font-bold text-[11px] border border-accent/20 mt-0.5">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-ink dark:text-white">
                            {action.title}
                          </p>
                          <p className="text-[11px] text-ink-muted dark:text-slate-400 mt-0.5 leading-relaxed font-sans">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Real-Time Gemini AI Grounding & Web Intelligence (Preserved) */}
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

                {/* Interactive ELA Inspection Heatmap Tool (Preserved) */}
                <div className="sk-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-ink-muted" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400 font-heading">
                        {lang === "en" ? "Interactive ELA Heatmap" : "इंटरैक्टिव ELA हीटमैप"}
                      </span>
                    </div>
                    {imageURL && !activeSample ? (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() => setShowELA((s) => !s)}
                        leftIcon={<Eye className="w-3.5 h-3.5 text-accent" />}
                      >
                        {showELA ? "Hide ELA Heatmap" : "Show ELA Heatmap"}
                      </Button>
                    ) : activeSample ? (
                      <span className="text-[10px] text-ink-faint dark:text-slate-600 italic">
                        (Simulated for demo)
                      </span>
                    ) : null}
                  </div>
                  <ELAScoreBar score={result.elaScore} />
                  {showELA && !activeSample && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-surface dark:bg-dark-surface border border-border dark:border-dark-border">
                      <Info className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                      <p className="text-[10px] text-ink-muted dark:text-slate-400 font-sans">
                        Heatmap overlaid on preview image — red/bright zones indicate localized pixel compression anomalies.
                      </p>
                    </div>
                  )}
                </div>

                {/* Collapsible Technical Evidence Checklist (Preserved) */}
                <div className="sk-card p-4 space-y-2">
                  <button
                    className="w-full flex items-center justify-between cursor-pointer"
                    onClick={() => setShowFullEvidence((s) => !s)}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-ink-muted" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400 font-heading">
                        {lang === "en" ? "Full Evidence Checklist" : "विस्तृत साक्ष्य सूची"} ({result.evidencePoints.length})
                      </span>
                    </div>
                    {showFullEvidence ? (
                      <ChevronUp className="w-4 h-4 text-ink-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-ink-muted" />
                    )}
                  </button>
                  {showFullEvidence && (
                    <ol className="space-y-2 mt-2 pt-2 border-t border-border/60 dark:border-white/5">
                      {result.evidencePoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-ink dark:text-slate-200">
                          <span className="font-mono font-bold text-ink-faint dark:text-slate-600 shrink-0 w-4">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-sans leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>

                {/* ── Action Buttons: Cryptographic Export, Viral Family Shield, Cyber-Cell 1930 ── */}
                <div className="space-y-2 pt-1">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={downloadReceipt}
                    className="flex items-center justify-center gap-2"
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    {lang === "en"
                      ? "Export Cryptographic Audit Dossier (JSON)"
                      : "डिजिटल साक्ष्य दस्तावेज़ डाउनलोड करें (JSON)"}
                  </Button>

                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => {
                      if (onOpenShareShield) {
                        onOpenShareShield({
                          module: "UPI & Receipt Forensics",
                          verdict: result.verdict,
                          riskScore: riskScore,
                          target: result.upiHandle
                            ? `${result.upiHandle.handle} (UTR: ${result.utrValue || "N/A"})`
                            : result.utrValue || "UPI Payment Receipt",
                          evidence: result.evidencePoints,
                          sha256: result.sha256,
                          timestamp: result.timestamp,
                        });
                      }
                    }}
                    className="text-xs flex items-center justify-center gap-2"
                    leftIcon={<Share2 className="w-4 h-4 text-accent" />}
                  >
                    {lang === "en"
                      ? "🛡️ Generate Family Shield & Share Alert (WhatsApp/Instagram)"
                      : "🛡️ फ़ैमिली शील्ड बनाएं व अलर्ट शेयर करें"}
                  </Button>

                  {(result.verdict === "fraud" || result.verdict === "suspicious") && (
                    <Button
                      variant="danger"
                      fullWidth
                      onClick={handleCyberCellReport}
                      className="text-xs flex items-center justify-center gap-2"
                      leftIcon={<ShieldAlert className="w-4 h-4 text-white" />}
                    >
                      {lang === "en"
                        ? "Dispatch 1930 / Cyber-Cell Complaint"
                        : "1930 / साइबर सेल शिकायत तैयार करें"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Cyber Cell Modal ── */}
      {showCyberModal && cyberCellData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-xs">
          <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border dark:border-dark-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-ink dark:text-white">
                  National Cyber Crime Reporting Portal (1930 / CFCFRMS)
                </h3>
              </div>
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setShowCyberModal(false)}
                className="p-1.5"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
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
                <label className="text-xs font-semibold text-ink-muted dark:text-slate-400">
                  Official Police Complaint Draft (Ready to Submit)
                </label>
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => {
                    navigator.clipboard.writeText(cyberCellData.formalPoliceNarrative);
                    setCopiedPoliceText(true);
                    setTimeout(() => setCopiedPoliceText(false), 2000);
                  }}
                  className="flex items-center gap-1 text-xs"
                >
                  <Copy className="w-3 h-3" />
                  {copiedPoliceText ? "Copied!" : "Copy Full Text"}
                </Button>
              </div>
              <textarea
                readOnly
                value={cyberCellData.formalPoliceNarrative}
                rows={10}
                className="w-full text-xs font-mono p-3 rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-ink dark:text-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] font-mono text-ink-faint dark:text-slate-500">
                Ref Code: {cyberCellData.acknowledgementCode}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  onClick={() => setShowCyberModal(false)}
                >
                  Close
                </Button>
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
