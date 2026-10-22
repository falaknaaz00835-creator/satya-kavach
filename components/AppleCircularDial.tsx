"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";

interface AppleCircularDialProps {
  score: number; // 0 to 100
  verdict: "genuine" | "suspicious" | "fraud";
  size?: number; // diameter in px (default 128)
  strokeWidth?: number; // ring stroke width (default 10)
  label?: string;
  lang?: "en" | "hi";
  showVerdictBadge?: boolean;
}

export default function AppleCircularDial({
  score,
  verdict,
  size = 124,
  strokeWidth = 10,
  label,
  lang = "en",
  showVerdictBadge = true,
}: AppleCircularDialProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Trigger smooth score animation on mount or value change
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedScore(Math.min(100, Math.max(0, score)));
    }, 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Determine color themes based on verdict
  const theme =
    verdict === "fraud"
      ? {
          stroke: "#EF4444", // Crimson
          gradientId: "dial-fraud-grad",
          glowColor: "rgba(239, 68, 68, 0.4)",
          trackBg: "rgba(239, 68, 68, 0.1)",
          textClass: "text-red-500 dark:text-red-400",
          badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
          icon: ShieldAlert,
          title: lang === "en" ? "CRITICAL FRAUD" : "गंभीर धोखाधड़ी",
        }
      : verdict === "suspicious"
      ? {
          stroke: "#F59E0B", // Amber
          gradientId: "dial-warn-grad",
          glowColor: "rgba(245, 158, 11, 0.4)",
          trackBg: "rgba(245, 158, 11, 0.1)",
          textClass: "text-amber-500 dark:text-amber-400",
          badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
          icon: AlertTriangle,
          title: lang === "en" ? "SUSPICIOUS RISK" : "संदिग्ध जोखिम",
        }
      : {
          stroke: "#10B981", // Emerald
          gradientId: "dial-trust-grad",
          glowColor: "rgba(16, 185, 129, 0.4)",
          trackBg: "rgba(16, 185, 129, 0.1)",
          textClass: "text-emerald-500 dark:text-emerald-400",
          badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
          icon: ShieldCheck,
          title: lang === "en" ? "GENUINE / SAFE" : "प्रमाणिक / सुरक्षित",
        };

  const Icon = theme.icon;

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 origin-center transition-transform"
        >
          <defs>
            {/* Emerald Gradient */}
            <linearGradient id="dial-trust-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Amber Gradient */}
            <linearGradient id="dial-warn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FBBF24" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>

            {/* Crimson Gradient */}
            <linearGradient id="dial-fraud-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F87171" />
              <stop offset="100%" stopColor="#DC2626" />
            </linearGradient>

            {/* Subtle glow filter */}
            <filter id="dial-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor={theme.glowColor} />
            </filter>
          </defs>

          {/* Background Concentric Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-white/[0.07]"
          />

          {/* Animated Activity Progress Ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${theme.gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#dial-glow)"
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </svg>

        {/* Center Counter (Apple Watch Style) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
            {animatedScore}
            <span className="text-xs text-slate-400 font-normal">/100</span>
          </span>
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-1">
            {label || (lang === "en" ? "Risk Score" : "जोखिम")}
          </span>
        </div>
      </div>

      {/* Optional Verdict Status Pill */}
      {showVerdictBadge && (
        <div
          className={clsx(
            "mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase shadow-sm transition-all",
            theme.badgeClass
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span>{theme.title}</span>
        </div>
      )}
    </div>
  );
}
