"use client";

import React from "react";
import clsx from "clsx";
import {
  Globe2,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
} from "lucide-react";

export interface GroundingCardProps {
  entityProfile?: {
    entityName?: string;
    entityType?: string;
    registryStatus?: string;
    domainFootprint?: string;
    isVerifiedEntity?: boolean;
    riskCategory?: string;
  };
  liveWebStatus?: {
    summary: string;
    reputationScore: number;
    searchSignals: string[];
    groundedSources?: Array<{ title: string; url: string }>;
  };
  riskRationale?: string;
  actionSteps?: string[];
  provider?: string;
  lang?: "en" | "hi";
}

export default function RealTimeGroundingCard({
  entityProfile,
  liveWebStatus,
  riskRationale,
  actionSteps,
  provider,
  lang = "en",
}: GroundingCardProps) {
  if (!entityProfile && !liveWebStatus && !riskRationale) return null;

  const repScore = liveWebStatus?.reputationScore ?? 50;
  const repColor =
    repScore >= 75
      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500"
      : repScore >= 40
      ? "text-amber-600 dark:text-amber-400 bg-amber-500"
      : "text-red-600 dark:text-red-400 bg-red-500";

  return (
    <div className="sk-card p-5 border border-indigo-500/25 bg-gradient-to-br from-indigo-50/40 via-surface to-purple-50/30 dark:from-indigo-950/20 dark:via-dark-card dark:to-purple-950/20 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border dark:border-dark-border pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-ink dark:text-white flex items-center gap-1.5">
              {lang === "en"
                ? "Real-Time Gemini AI Grounding & Web Intelligence"
                : "रीयल-टाइम जेमिनी एआई ग्राउंडिंग और वेब इंटेलिजेंस"}
            </h3>
            <p className="text-[10px] text-ink-muted dark:text-slate-400 font-mono">
              Live Registry Cross-Reference · Threat Intelligence Feeds
            </p>
          </div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          {provider || "Gemini 3.8 Flash"}
        </span>
      </div>

      {/* Grid: Entity Profile & Live Web Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Entity Profile */}
        {entityProfile && (
          <div className="bg-surface dark:bg-dark-surface p-3 rounded-lg border border-border dark:border-dark-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-slate-400 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                {lang === "en" ? "Entity Profile" : "संस्था प्रोफ़ाइल"}
              </span>
              {entityProfile.isVerifiedEntity ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-3 h-3" /> Unverified / High-Risk
                </span>
              )}
            </div>

            <div>
              <p className="font-bold text-sm text-ink dark:text-white truncate">
                {entityProfile.entityName || "Identified Artifact"}
              </p>
              <p className="text-[11px] text-ink-muted dark:text-slate-400">
                {entityProfile.entityType || "Unknown Entity Type"}
              </p>
            </div>

            <div className="pt-1 border-t border-border/60 dark:border-dark-border/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-ink-faint dark:text-slate-500">Registry:</span>
              <span className="font-semibold text-ink dark:text-slate-200 truncate max-w-[180px]">
                {entityProfile.registryStatus || "Unindexed"}
              </span>
            </div>

            {entityProfile.domainFootprint && (
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-ink-faint dark:text-slate-500">Footprint:</span>
                <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[180px]">
                  {entityProfile.domainFootprint}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Live Web Status */}
        {liveWebStatus && (
          <div className="bg-surface dark:bg-dark-surface p-3 rounded-lg border border-border dark:border-dark-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-slate-400 flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
                {lang === "en" ? "Live Web Status" : "लाइव वेब स्थिति"}
              </span>
              <span className="text-[10px] font-mono font-bold text-ink dark:text-white">
                Reputation: {repScore}/100
              </span>
            </div>

            <p className="text-[11px] text-ink-muted dark:text-slate-300 leading-relaxed">
              {liveWebStatus.summary}
            </p>

            {/* Search signals */}
            {liveWebStatus.searchSignals && liveWebStatus.searchSignals.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {liveWebStatus.searchSignals.map((sig, i) => (
                  <span
                    key={i}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-surface dark:bg-dark-surface border border-border dark:border-dark-border text-ink-muted dark:text-slate-400 truncate max-w-[200px]"
                  >
                    • {sig}
                  </span>
                ))}
              </div>
            )}

            {/* Grounded Sources */}
            {liveWebStatus.groundedSources && liveWebStatus.groundedSources.length > 0 && (
              <div className="pt-1.5 border-t border-border/60 dark:border-dark-border/60">
                <p className="text-[10px] text-ink-faint dark:text-slate-500 mb-1">
                  Google Search Grounded Citations:
                </p>
                <div className="space-y-0.5">
                  {liveWebStatus.groundedSources.slice(0, 2).map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                    >
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{src.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Risk Rationale */}
      {riskRationale && (
        <div className="p-3 rounded-lg bg-surface/70 dark:bg-dark-surface/70 border border-border dark:border-dark-border">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-slate-400 mb-1">
            {lang === "en" ? "Investigative Rationale" : "जांच का औचित्य"}
          </p>
          <p className="text-xs text-ink dark:text-slate-200 leading-relaxed">
            {riskRationale}
          </p>
        </div>
      )}

      {/* Protective Action Steps */}
      {actionSteps && actionSteps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-slate-400">
            {lang === "en" ? "Recommended Citizen Action Steps" : "नागरिक सुरक्षा कदम"}
          </p>
          <div className="space-y-1">
            {actionSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-xs text-ink dark:text-slate-200 bg-surface dark:bg-dark-surface p-2 rounded border border-border dark:border-dark-border"
              >
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 shrink-0 text-[11px]">
                  0{i + 1}
                </span>
                <span className="text-[11px] leading-tight">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
