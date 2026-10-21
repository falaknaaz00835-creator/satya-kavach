"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  X,
  Download,
  Printer,
  Trash2,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  CircleSlash,
} from "lucide-react";
import {
  clearLedger,
  summarise,
  type LedgerEntry,
  type Verdict,
} from "@/lib/ledger";
import { MODULES, type ModuleId } from "@/lib/modules";

interface LedgerDrawerProps {
  open: boolean;
  onClose: () => void;
  entries: LedgerEntry[];
  lang: "en" | "hi";
  onOpenModule: (id: ModuleId) => void;
}

const TONE: Record<Verdict, { cls: string; en: string; hi: string; icon: any }> = {
  fraud: { cls: "sk-badge-fraud", en: "Fraud", hi: "ठगी", icon: AlertTriangle },
  suspicious: { cls: "sk-badge-warn", en: "Caution", hi: "संदेह", icon: AlertTriangle },
  genuine: { cls: "sk-badge-trust", en: "Clean", hi: "साफ़", icon: ShieldCheck },
  unknown: {
    cls: "inline-flex items-center gap-1.5 rounded border border-rule px-2 py-1 font-mono text-2xs uppercase tracking-wider text-ink-faint dark:border-white/15 dark:text-white/40",
    en: "Logged",
    hi: "दर्ज",
    icon: CircleSlash,
  },
};

async function sha256of(text: string) {
  if (!globalThis.crypto?.subtle) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function LedgerDrawer({
  open,
  onClose,
  entries,
  lang,
  onOpenModule,
}: LedgerDrawerProps) {
  const [filter, setFilter] = useState<string>("all");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmClear(false);
      setFilter("all");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const present = useMemo(() => {
    const ids = new Set(entries.map((e) => e.module));
    return MODULES.filter((m) => ids.has(m.id));
  }, [entries]);

  const visible = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.module === filter)),
    [entries, filter]
  );

  const stats = summarise(entries);

  const exportJson = async () => {
    const payload = {
      document: "SatyaKavach Evidence Ledger",
      issuedAt: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      summary: stats,
      entries: visible.map((e) => ({
        reference: e.id,
        module: e.module,
        instrument: e.moduleLabel,
        verdict: e.verdict,
        riskScore: e.riskScore,
        summary: e.summary,
        evidenceHash: e.hash ?? null,
        recordedAt: new Date(e.at).toISOString(),
        demoCase: !!e.demo,
      })),
      disclaimer:
        "Forensic assistance only. This ledger is not a legal certificate. Verify with your bank or the National Cyber Crime Reporting Portal (1930).",
    };
    const body = JSON.stringify(payload, null, 2);
    const digest = await sha256of(body);
    const withDigest = digest ? { ...payload, bundleDigest: `sha256:${digest}` } : payload;
    const blob = new Blob([JSON.stringify(withDigest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `satya-kavach-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="fade-in absolute inset-0 bg-ink/25 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-label="Evidence ledger"
        className="slide-right absolute right-0 top-0 flex h-full w-full max-w-[440px] flex-col border-l border-rule bg-paper dark:border-dark-border dark:bg-dark-surface"
      >
        {/* Head */}
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4 dark:border-dark-border">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-ink-muted dark:text-white/45" />
              <h2 className="font-display text-[19px] leading-none text-ink dark:text-white">
                {lang === "en" ? "Evidence ledger" : "साक्ष्य लेजर"}
              </h2>
            </div>
            <p className="mt-1.5 font-mono text-2xs uppercase tracking-eyebrow text-ink-faint dark:text-white/30">
              {stats.total} {lang === "en" ? "entries" : "प्रविष्टियाँ"} · {stats.flagged}{" "}
              {lang === "en" ? "fraud" : "ठगी"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md border border-rule text-ink-muted transition hover:border-ink hover:text-ink dark:border-white/15 dark:text-white/50 dark:hover:text-white"
            aria-label="Close ledger"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Filters */}
        {entries.length > 0 && (
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-b border-rule px-4 py-2.5 dark:border-dark-border">
            {[{ id: "all", label: lang === "en" ? "All" : "सभी" }, ...present.map((m) => ({
              id: m.id,
              label: m.no,
            }))].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  "shrink-0 rounded-md border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition",
                  filter === f.id
                    ? "border-ink bg-ink text-paper dark:border-white dark:bg-white dark:text-ink"
                    : "border-rule text-ink-muted hover:border-ink-faint dark:border-white/15 dark:text-white/45"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5">
          {visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-full border border-rule dark:border-white/15">
                <BookOpen className="h-5 w-5 text-ink-faint dark:text-white/25" />
              </div>
              <p className="max-w-[26ch] text-[13px] leading-relaxed text-ink-muted dark:text-white/45">
                {lang === "en"
                  ? "No inspections recorded yet. Run one and it is written here — with a hash, a verdict and a time."
                  : "अभी कोई जाँच दर्ज नहीं। एक जाँच करें — हैश, निर्णय और समय यहाँ लिखा जाएगा।"}
              </p>
              <button
                onClick={() => {
                  onOpenModule("upi");
                  onClose();
                }}
                className="sk-btn-ghost px-3 py-2 text-xs"
              >
                {lang === "en" ? "Open an instrument" : "यंत्र खोलें"}
              </button>
            </div>
          ) : (
            <ul className="py-1">
              {visible.map((e) => {
                const tone = TONE[e.verdict];
                return (
                  <li key={e.id} className="border-b border-dashed border-rule py-4 last:border-0 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] tracking-wide text-ink dark:text-white/85">
                          {e.id}
                        </p>
                        <p className="mt-1 text-[13px] font-medium text-ink dark:text-white/80">
                          {e.moduleLabel}
                          {e.demo && (
                            <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/25">
                              {lang === "en" ? "demo" : "डेमो"}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className={tone.cls}>{lang === "en" ? tone.en : tone.hi}</span>
                    </div>

                    {e.summary && (
                      <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-muted dark:text-white/40">
                        {e.summary}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/25">
                      <span>
                        {new Date(e.at).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}{" "}
                        IST
                      </span>
                      {e.riskScore !== null && (
                        <span>
                          {lang === "en" ? "risk" : "जोखिम"} {e.riskScore}
                        </span>
                      )}
                      {e.hash && <span className="truncate">#{e.hash.slice(0, 12)}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Foot */}
        <div className="border-t border-rule bg-card/60 px-4 py-3 dark:border-dark-border dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <button
              onClick={exportJson}
              disabled={entries.length === 0}
              className="sk-btn-primary flex-1 px-3 py-2 text-xs disabled:opacity-30"
            >
              <Download className="h-3.5 w-3.5" />
              {lang === "en" ? "Export JSON" : "JSON निर्यात"}
            </button>
            <button
              onClick={() => window.print()}
              disabled={entries.length === 0}
              className="sk-btn-ghost px-3 py-2 text-xs disabled:opacity-30"
              aria-label="Print"
            >
              <Printer className="h-3.5 w-3.5" />
            </button>
            {confirmClear ? (
              <button
                onClick={() => {
                  clearLedger();
                  setConfirmClear(false);
                }}
                className="rounded-lg border border-fraud/40 bg-fraud-bg px-3 py-2 text-xs font-medium text-fraud"
              >
                {lang === "en" ? "Confirm" : "पुष्टि"}
              </button>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={entries.length === 0}
                className="rounded-lg border border-rule px-3 py-2 text-ink-muted transition hover:border-fraud/40 hover:text-fraud disabled:opacity-30 dark:border-white/15 dark:text-white/40"
                aria-label="Clear ledger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/20">
            {lang === "en"
              ? "Local to this browser · export before clearing"
              : "केवल इस ब्राउज़र में · साफ़ करने से पहले निर्यात करें"}
          </p>
        </div>
      </aside>
    </div>
  );
}
