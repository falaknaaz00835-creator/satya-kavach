"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Share2,
  Download,
  Copy,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Check,
  MessageSquare,
  Send,
  Camera,
} from "lucide-react";
import clsx from "clsx";

export interface ShareShieldData {
  module: string;
  verdict: "genuine" | "suspicious" | "fraud";
  riskScore: number;
  target?: string;
  evidence: string[];
  sha256?: string;
  timestamp?: string;
}

interface ShareShieldModalProps {
  data: ShareShieldData;
  onClose: () => void;
  lang?: "en" | "hi";
}

export default function ShareShieldModal({
  data,
  onClose,
  lang = "en",
}: ShareShieldModalProps) {
  const [copied, setCopied] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const storyCanvasRef = useRef<HTMLCanvasElement>(null);

  const isFraud = data.verdict === "fraud";
  const isSuspicious = data.verdict === "suspicious";

  // Pre-filled bilingual warning text for WhatsApp & Telegram
  const alertText = isFraud
    ? `🚨 *CYBER FRAUD WARNING — SATYA KAVACH ALERT* 🚨
सत्य कवच एआई ने एक डिजिटल धोखाधड़ी / स्कैम का पता लगाया है:

• *प्रकार / Type:* ${data.module.toUpperCase()} Scam Vector
• *निर्णय / Verdict:* ❌ FRAUDULENT (जोखिम: ${data.riskScore}%)
• *संदिग्ध लक्ष्य / Target:* ${data.target || "Altered Digital Artifact"}
• *मुख्य साक्ष्य / Evidence:*
  - ${data.evidence.slice(0, 2).join("\n  - ")}

⚠ *चेतावनी / Warning:*
किसी भी अनजान व्यक्ति को पैसे न भेजें और पैसे प्राप्त करने के लिए कभी भी UPI पिन दर्ज न करें!
यदि धोखा हुआ है तो तुरंत 1930 पर कॉल करें या cybercrime.gov.in पर रिपोर्ट करें।

🛡️ Verified by SatyaKavach Autonomous Cyber Defense Core (सत्य कवच)`
    : `✅ *SATYA KAVACH SECURITY VERIFICATION* ✅
SatyaKavach Forensic Engine has verified this transaction / artifact:

• *Type:* ${data.module.toUpperCase()}
• *Verdict:* ✓ GENUINE & SECURE
• *Evidence Digest:* ${data.sha256?.substring(0, 16) || "SHA-256 Verified"}...

Stay vigilant with SatyaKavach (सत्य कवच).`;

  // WhatsApp 1-Click Share
  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(alertText)}`;
    window.open(url, "_blank");
  };

  // Telegram 1-Click Share
  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent("https://cybercrime.gov.in")}&text=${encodeURIComponent(alertText)}`;
    window.open(url, "_blank");
  };

  // Copy Alert Text to Clipboard
  const handleCopyText = () => {
    navigator.clipboard.writeText(alertText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate 9:16 Instagram Story PNG Image via Canvas
  const handleGenerateInstagramStory = () => {
    setGeneratingStory(true);
    const canvas = storyCanvasRef.current;
    if (!canvas) {
      setGeneratingStory(false);
      return;
    }

    // 1080 x 1920 Instagram Story Resolution
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setGeneratingStory(false);
      return;
    }

    // Background Gradient (Dark Cyberpunk Blue/Black)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, "#030712");
    bgGrad.addColorStop(0.5, isFraud ? "#1F0808" : "#061A14");
    bgGrad.addColorStop(1, "#030712");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Glowing border frame
    ctx.lineWidth = 12;
    ctx.strokeStyle = isFraud ? "#EF4444" : "#10B981";
    ctx.shadowColor = isFraud ? "#EF4444" : "#10B981";
    ctx.shadowBlur = 40;
    ctx.strokeRect(40, 40, 1000, 1840);
    ctx.shadowBlur = 0;

    // Header Logo & Badge
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 58px system-ui, -apple-system, sans-serif";
    ctx.fillText("🛡️ SATYAKAVACH · सत्य कवच", 540, 180);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "32px monospace";
    ctx.fillText("AUTONOMOUS DIGITAL FORENSICS & THREAT SHIELD", 540, 240);

    // Giant Verdict Box
    ctx.fillStyle = isFraud ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)";
    ctx.strokeStyle = isFraud ? "#EF4444" : "#10B981";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(100, 320, 880, 300, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFraud ? "#EF4444" : "#10B981";
    ctx.font = "bold 76px system-ui, -apple-system, sans-serif";
    ctx.fillText(isFraud ? "⚠ THREAT DETECTED" : "✓ VERIFIED SAFE", 540, 440);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 42px monospace";
    ctx.fillText(
      `MODULE: ${data.module.toUpperCase()} · RISK: ${data.riskScore}%`,
      540,
      520
    );

    // Target Details Box
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(100, 670, 880, 240, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = "#94A3B8";
    ctx.font = "28px monospace";
    ctx.fillText("ANALYZED ARTIFACT / TARGET:", 140, 730);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 38px monospace";
    const truncatedTarget = (data.target || "Digital Screenshot / Bill").slice(0, 36);
    ctx.fillText(truncatedTarget, 140, 795);

    ctx.fillStyle = "#64748B";
    ctx.font = "24px monospace";
    ctx.fillText(`SHA-256: ${data.sha256?.slice(0, 32) || "4ec4bff..."}`, 140, 855);

    // Key Evidence Points
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
    ctx.fillText("FORENSIC EVIDENCE FINDINGS:", 100, 980);

    let startY = 1040;
    const evidenceItems = data.evidence.slice(0, 4);
    for (const item of evidenceItems) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(100, startY, 880, 110, 16);
      ctx.fill();

      ctx.fillStyle = isFraud ? "#FCA5A5" : "#6EE7B7";
      ctx.font = "bold 30px system-ui, -apple-system, sans-serif";
      const truncatedItem = item.length > 52 ? item.slice(0, 50) + "..." : item;
      ctx.fillText(`• ${truncatedItem}`, 130, startY + 65);
      startY += 135;
    }

    // Emergency Helpline Callout Banner
    ctx.fillStyle = isFraud ? "rgba(239, 68, 68, 0.25)" : "rgba(6, 182, 212, 0.2)";
    ctx.strokeStyle = isFraud ? "#EF4444" : "#06B6D4";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(100, 1620, 880, 180, 24);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 38px system-ui, -apple-system, sans-serif";
    ctx.fillText("🚨 CALL 1930 OR REPORT AT cybercrime.gov.in", 540, 1700);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "26px monospace";
    ctx.fillText("Citizen Financial Cyber Fraud Reporting System (I4C)", 540, 1750);

    // Trigger image download
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `satyakavach-story-alert-${Date.now()}.png`;
    a.click();
    setGeneratingStory(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border dark:border-dark-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-ink dark:text-white">
                {lang === "en" ? "Family Shield & Viral Share" : "पारिवारिक सुरक्षा और साझा करें"}
              </h3>
              <p className="text-[10px] text-ink-muted dark:text-slate-400 font-mono">
                Warn loved ones against active scams across WhatsApp & Instagram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Visual Security Alert Card Preview */}
        <div
          className={clsx(
            "p-4 rounded-xl border space-y-3 relative overflow-hidden",
            isFraud
              ? "bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900/60"
              : "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-ink-muted dark:text-slate-400">
              SatyaKavach Verified Dossier
            </span>
            <span
              className={clsx(
                "text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                isFraud ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
              )}
            >
              {isFraud ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              {data.verdict.toUpperCase()} ({data.riskScore}%)
            </span>
          </div>

          <div>
            <p className="font-semibold text-sm text-ink dark:text-white">
              {data.target || "Digital Payment / QR / Document Incident"}
            </p>
            <p className="text-[11px] text-ink-muted dark:text-slate-400 font-mono mt-0.5">
              Module: {data.module.toUpperCase()} · SHA-256: {data.sha256?.substring(0, 16)}...
            </p>
          </div>

          <div className="text-xs text-ink dark:text-slate-300 space-y-1 bg-surface/80 dark:bg-dark-surface/80 p-2.5 rounded-lg border border-border/80 dark:border-dark-border/80">
            <p className="font-semibold text-[11px] text-ink-muted dark:text-slate-400 uppercase">
              Key Evidence Point:
            </p>
            <p className="line-clamp-2 text-[11px]">
              {data.evidence[0] || "No upfront fee or hardware deposit demands identified."}
            </p>
          </div>
        </div>

        {/* 1-Click Viral Sharing Actions */}
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-slate-400">
            Instant 1-Click Sharing Channels:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {/* WhatsApp */}
            <button
              onClick={handleWhatsAppShare}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp Forward
            </button>

            {/* Telegram */}
            <button
              onClick={handleTelegramShare}
              className="p-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
            >
              <Send className="w-4 h-4" />
              Telegram Forward
            </button>

            {/* Instagram Stories (9:16 PNG) */}
            <button
              onClick={handleGenerateInstagramStory}
              disabled={generatingStory}
              className="p-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-90 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
            >
              <Camera className="w-4 h-4" />
              {generatingStory ? "Generating..." : "Instagram Story (9:16)"}
            </button>

            {/* Copy Verbatim Text */}
            <button
              onClick={handleCopyText}
              className="p-3 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface hover:bg-card text-ink dark:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copied to Clipboard!" : "Copy Full Text"}
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-border dark:border-dark-border flex items-center justify-between text-[11px] text-ink-muted dark:text-slate-400 font-mono">
          <span>Helpline: 1930</span>
          <span>cybercrime.gov.in</span>
        </div>

        {/* Hidden Canvas used for generating 1080x1920 Instagram Story PNG */}
        <canvas ref={storyCanvasRef} className="hidden" />
      </div>
    </div>
  );
}
