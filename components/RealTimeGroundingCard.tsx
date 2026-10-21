"use client";

import {
  Globe2,
  Building2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Search,
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
  const repTone =
    repScore >= 75
      ? { text: "text-trust", bar: "bg-trust", label: lang === "en" ? "Trusted" : "विश्वसनीय" }
      : repScore >= 40
      ? { text: "text-warning", bar: "bg-warning", label: lang === "en" ? "Mixed" : "मिश्रित" }
      : { text: "text-fraud", bar: "bg-fraud", label: lang === "en" ? "Hostile" : "संदिग्ध" };

  return (
    <section className="overflow-hidden rounded-xl border border-rule bg-card dark:border-dark-border dark:bg-dark-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-4 py-3 dark:border-dark-border">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-ink-faint dark:text-white/35" strokeWidth={1.8} />
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-muted dark:text-white/50">
              {lang === "en" ? "Live registry & web intelligence" : "लाइव रजिस्ट्री व वेब इंटेलिजेंस"}
            </h3>
            <p className="mt-0.5 text-[11px] text-ink-faint dark:text-white/30">
              {lang === "en"
                ? "Cross-referenced against public registries and open sources"
                : "सार्वजनिक रजिस्ट्री और खुले स्रोतों से मिलान"}
            </p>
          </div>
        </div>
        <span className="rounded border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:border-white/15 dark:text-white/35">
          {provider || "Gemini grounded"}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Entity */}
          {entityProfile && (
            <div className="rounded-lg border border-rule bg-paper/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/30">
                  <Building2 className="h-3 w-3" />
                  {lang === "en" ? "Entity" : "संस्था"}
                </span>
                {entityProfile.isVerifiedEntity ? (
                  <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-trust">
                    <ShieldCheck className="h-2.5 w-2.5" />
                    {lang === "en" ? "verified" : "सत्यापित"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-warning">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {lang === "en" ? "unverified" : "असत्यापित"}
                  </span>
                )}
              </div>

              <p className="mt-2 truncate font-display text-[16px] text-ink dark:text-white">
                {entityProfile.entityName || (lang === "en" ? "Unidentified artefact" : "अज्ञात आर्टिफैक्ट")}
              </p>
              <p className="text-[11px] text-ink-muted dark:text-white/40">
                {entityProfile.entityType || "—"}
              </p>

              <dl className="mt-2.5 space-y-1.5 border-t border-dashed border-rule pt-2 font-mono text-[10px] dark:border-white/10">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-ink-faint dark:text-white/25">
                    {lang === "en" ? "registry" : "रजिस्ट्री"}
                  </dt>
                  <dd className="max-w-[62%] truncate text-ink dark:text-white/70">
                    {entityProfile.registryStatus || "Unindexed"}
                  </dd>
                </div>
                {entityProfile.domainFootprint && (
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-ink-faint dark:text-white/25">
                      {lang === "en" ? "footprint" : "उपस्थिति"}
                    </dt>
                    <dd className="max-w-[62%] truncate text-ink dark:text-white/70">
                      {entityProfile.domainFootprint}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Reputation */}
          {liveWebStatus && (
            <div className="rounded-lg border border-rule bg-paper/60 p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/30">
                  <Globe2 className="h-3 w-3" />
                  {lang === "en" ? "Reputation" : "प्रतिष्ठा"}
                </span>
                <span className={`font-mono text-[10px] font-semibold ${repTone.text}`}>
                  {repScore}/100
                </span>
              </div>

              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-rule dark:bg-white/10">
                <div
                  className={`h-full ${repTone.bar}`}
                  style={{ width: `${Math.min(100, Math.max(4, repScore))}%` }}
                />
              </div>

              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted dark:text-white/45">
                {liveWebStatus.summary}
              </p>

              {!!liveWebStatus.searchSignals?.length && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {liveWebStatus.searchSignals.slice(0, 4).map((sig, i) => (
                    <span
                      key={i}
                      className="max-w-full truncate rounded border border-rule px-1.5 py-0.5 font-mono text-[9px] text-ink-faint dark:border-white/10 dark:text-white/30"
                    >
                      {sig}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!!liveWebStatus?.groundedSources?.length && (
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/25">
              {lang === "en" ? "Grounded sources" : "स्रोत"}
            </p>
            <div className="divide-y divide-rule dark:divide-white/10">
              {liveWebStatus.groundedSources.slice(0, 3).map((src, i) => (
                <a
                  key={i}
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-2 py-1.5 text-[11px] text-ink-muted transition-colors hover:text-ink dark:text-white/40 dark:hover:text-white"
                >
                  <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-50" />
                  <span className="truncate">{src.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {riskRationale && (
          <div className="border-l-2 border-accent/70 pl-3">
            <p className="font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/25">
              {lang === "en" ? "Investigative rationale" : "जाँच का आधार"}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft dark:text-white/60">
              {riskRationale}
            </p>
          </div>
        )}

        {!!actionSteps?.length && (
          <div>
            <p className="mb-1.5 font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/25">
              {lang === "en" ? "Citizen action steps" : "नागरिक कार्य कदम"}
            </p>
            <ol className="space-y-1.5">
              {actionSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[12px] leading-snug text-ink-soft dark:text-white/60">
                  <span className="font-mono text-[9px] text-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
