"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  ArrowRight,
  ArrowUpRight,
  CornerDownLeft,
  FileText,
  ShieldCheck,
  UploadCloud,
  X,
  Clipboard,
  Command,
  LifeBuoy,
  Clock3,
} from "lucide-react";
import { MODULES, type ModuleId } from "@/lib/modules";
import { queueIntake, guessTarget, describeFile, type IntakeTarget } from "@/lib/intake";
import { summarise, type LedgerEntry } from "@/lib/ledger";

interface TriageHomeProps {
  lang: "en" | "hi";
  entries: LedgerEntry[];
  onOpenModule: (id: ModuleId) => void;
  onOpenLedger: () => void;
  onOpenPalette: () => void;
}

const timeAgo = (ts: number) => {
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.round(m / 60)}h`;
};

const verdictTone: Record<string, string> = {
  fraud: "text-fraud",
  suspicious: "text-warning",
  genuine: "text-trust",
  unknown: "text-ink-faint",
};

const verdictWord: Record<string, { en: string; hi: string }> = {
  fraud: { en: "Fraud", hi: "ठगी" },
  suspicious: { en: "Caution", hi: "संदेह" },
  genuine: { en: "Clean", hi: "ठीक" },
  unknown: { en: "Logged", hi: "दर्ज" },
};

export default function TriageHome({
  lang,
  entries,
  onOpenModule,
  onOpenLedger,
  onOpenPalette,
}: TriageHomeProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = summarise(entries);
  const guess = file ? guessTarget(file) : null;

  const accept = useCallback((incoming: File | null | undefined) => {
    if (!incoming) return;
    if (incoming.size > 40 * 1024 * 1024) {
      setError(
        "That file is over 40 MB. Trim the clip or send a shorter segment."
      );
      return;
    }
    setError(null);
    setFile(incoming);
  }, []);

  /* Date is resolved on the client only — avoids a hydration mismatch */
  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
  }, []);

  /* Paste a screenshot straight from the clipboard */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const image = items.find((i) => i.type.startsWith("image/"));
      if (image) {
        const pasted = image.getAsFile();
        if (pasted) accept(pasted);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [accept]);

  const route = (target: IntakeTarget) => {
    if (!file) return;
    queueIntake(target, file);
    onOpenModule(target as ModuleId);
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-8 sm:px-8 lg:pt-12">
      {/* ═══════════ MASTHEAD ═══════════ */}
      <div className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="eyebrow">Bharat · Forensic workbench</span>
        <span className="h-3 w-px bg-rule-strong/70" aria-hidden />
        <span className="eyebrow">
          {lang === "en" ? "Five instruments, one verdict" : "पाँच यंत्र, एक निर्णय"}
        </span>
        <span className="ml-auto hidden font-mono text-2xs uppercase tracking-eyebrow text-ink-faint sm:block">
          {today}
        </span>
      </div>

      <div className="grid gap-x-12 gap-y-10 lg:grid-cols-12">
        {/* ═══════════ HERO / INTAKE ═══════════ */}
        <section className="lg:col-span-7">
          <h1 className="reveal font-display text-[clamp(2.1rem,5vw,3.9rem)] font-light leading-[1.02] tracking-tightest text-ink dark:text-white">
            {lang === "en" ? (
              <>
                Trust is a claim.
                <br />
                <span className="italic text-accent">Verify</span> it.
              </>
            ) : (
              <>
                भरोसा एक दावा है।
                <br />
                उसे <span className="italic text-accent">जाँचें</span>।
              </>
            )}
          </h1>

          <p className="reveal reveal-1 mt-5 max-w-[54ch] text-[15px] leading-relaxed text-ink-muted dark:text-white/60 text-pretty">
            {lang === "en"
              ? "SatyaKavach reads the file itself — pixels, payloads, metadata, signatures — then hands you a verdict you can take to a bank, a platform, or the cyber-cell. Not a guess. A receipt."
              : "सत्य कवच फ़ाइल को ही पढ़ता है — पिक्सेल, पेलोड, मेटाडेटा, हस्ताक्षर — और ऐसा निर्णय देता है जो आप बैंक, प्लेटफ़ॉर्म या साइबर सेल तक ले जा सकें। अंदाज़ा नहीं, रसीद।"}
          </p>

          {/* ── Universal intake dock ── */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              accept(e.dataTransfer.files?.[0]);
            }}
            className={clsx(
              "reveal reveal-2 relative mt-8 overflow-hidden rounded-xl border bg-card/70 transition-colors duration-200 dark:bg-white/[0.02]",
              dragging
                ? "border-accent bg-accent-bg/60 dark:border-accent"
                : "border-dashed border-rule-strong/80 hover:border-ink-faint dark:border-white/15 dark:hover:border-white/30"
            )}
          >
            {/* corner ticks — instrumentation, not decoration */}
            <span className="absolute left-2 top-2 h-2.5 w-2.5 border-l border-t border-ink-faint/60 dark:border-white/25" />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 border-r border-t border-ink-faint/60 dark:border-white/25" />
            <span className="absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l border-ink-faint/60 dark:border-white/25" />
            <span className="absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r border-ink-faint/60 dark:border-white/25" />

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => accept(e.target.files?.[0])}
            />

            {!file ? (
              <div className="px-5 py-7 sm:px-7 sm:py-9">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-rule bg-paper-sunk text-ink-muted dark:border-white/15 dark:bg-white/5 dark:text-white/60">
                    <UploadCloud className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[19px] leading-snug text-ink dark:text-white">
                      {lang === "en"
                        ? "Drop what they sent you."
                        : "जो उन्होंने भेजा है, यहाँ छोड़ें।"}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted dark:text-white/50">
                      {lang === "en"
                        ? "Screenshot, video clip, offer letter, bill or QR image. It stays in this browser unless you export a report."
                        : "स्क्रीनशॉट, वीडियो, ऑफर लेटर, बिल या QR इमेज। रिपोर्ट निर्यात करने तक यह आपके ब्राउज़र में ही रहता है।"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="sk-btn-primary px-4"
                  >
                    <FileText className="h-4 w-4" />
                    {lang === "en" ? "Choose a file" : "फ़ाइल चुनें"}
                  </button>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-rule bg-paper/70 px-2.5 py-2 font-mono text-2xs uppercase tracking-wider text-ink-faint dark:border-white/10 dark:bg-white/5 dark:text-white/40">
                    <Clipboard className="h-3 w-3" />
                    {lang === "en" ? "or press ⌘V" : "या ⌘V दबाएँ"}
                  </span>
                  <span className="ml-auto hidden font-mono text-2xs uppercase tracking-wider text-ink-faint sm:block dark:text-white/30">
                    ≤ 40 MB
                  </span>
                </div>

                {error && (
                  <p className="mt-4 border-l-2 border-fraud pl-3 text-xs text-fraud">{error}</p>
                )}
              </div>
            ) : (
              <div className="p-5 sm:p-7">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      {lang === "en" ? "File received" : "फ़ाइल प्राप्त हुई"}
                    </p>
                    <p className="mt-1.5 truncate font-mono text-[13px] text-ink dark:text-white">
                      {describeFile(file)}
                    </p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-rule text-ink-muted transition hover:border-ink hover:text-ink dark:border-white/15 dark:text-white/50 dark:hover:text-white"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="mb-3 text-[13px] text-ink-muted dark:text-white/50">
                  {lang === "en"
                    ? "Which instrument should open this?"
                    : "इसे कौन-सा यंत्र खोले?"}
                </p>

                <div className="grid gap-1.5">
                  {MODULES.map((m) => {
                    const Icon = m.icon;
                    const suggested = guess === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => route(m.id)}
                        className={clsx(
                          "group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all",
                          suggested
                            ? "border-ink/70 bg-paper-sunk dark:border-white/40 dark:bg-white/10"
                            : "border-transparent hover:border-rule hover:bg-paper-sunk/60 dark:hover:border-white/15 dark:hover:bg-white/5"
                        )}
                      >
                        <span className="font-mono text-2xs text-ink-faint dark:text-white/30">
                          {m.no}
                        </span>
                        <Icon
                          className="h-4 w-4 shrink-0 text-ink-muted dark:text-white/50"
                          strokeWidth={1.7}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink dark:text-white/90">
                          {lang === "en" ? m.label : m.labelHi}
                        </span>
                        {suggested && (
                          <span className="rounded border border-ink/25 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-muted dark:border-white/25 dark:text-white/50">
                            {lang === "en" ? "Best fit" : "उपयुक्त"}
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 dark:text-white/30" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <p className="reveal reveal-3 mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs uppercase tracking-wider text-ink-faint dark:text-white/30">
            <span>{lang === "en" ? "Nothing uploaded without you" : "आपकी अनुमति के बिना कुछ अपलोड नहीं"}</span>
            <span className="h-2.5 w-px bg-rule-strong/60" aria-hidden />
            <span>ELA · UTR · CIN · QR · EXIF</span>
          </p>
        </section>

        {/* ═══════════ LIVE DESK ═══════════ */}
        <aside className="lg:col-span-5">
          <div className="reveal reveal-2 rounded-xl border border-rule bg-card dark:border-dark-border dark:bg-dark-card">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3 dark:border-dark-border">
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-trust" />
                </span>
                <span className="eyebrow !text-ink-muted dark:!text-white/50">
                  {lang === "en" ? "Desk · this session" : "डेस्क · यह सत्र"}
                </span>
              </div>
              <button
                onClick={onOpenLedger}
                className="font-mono text-2xs uppercase tracking-wider text-ink-faint underline decoration-rule underline-offset-4 transition hover:text-ink dark:text-white/40 dark:hover:text-white"
              >
                {lang === "en" ? "Open ledger" : "लेजर खोलें"}
              </button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-rule border-b border-rule dark:divide-dark-border dark:border-dark-border">
              {[
                { k: stats.total, label: lang === "en" ? "Inspected" : "जाँचे", tone: "text-ink dark:text-white" },
                { k: stats.flagged, label: lang === "en" ? "Fraud" : "ठगी", tone: "text-fraud" },
                { k: stats.clean, label: lang === "en" ? "Clean" : "साफ़", tone: "text-trust" },
              ].map((s) => (
                <div key={s.label} className="px-4 py-4">
                  <p className={clsx("font-display text-[26px] leading-none tabular-nums", s.tone)}>
                    {String(s.k).padStart(2, "0")}
                  </p>
                  <p className="mt-1.5 font-mono text-2xs uppercase tracking-wider text-ink-faint dark:text-white/35">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-4 py-3">
              {entries.length === 0 ? (
                <div className="py-5">
                  <p className="text-[13px] leading-relaxed text-ink-muted dark:text-white/45">
                    {lang === "en"
                      ? "The ledger is empty. Run one inspection and the verdict, hash and timestamp land here — permanently, for this session."
                      : "लेजर खाली है। एक जाँच करें — निर्णय, हैश और समय यहाँ दर्ज हो जाएगा।"}
                  </p>
                  <button
                    onClick={() => onOpenModule("upi")}
                    className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink underline decoration-rule-strong decoration-1 underline-offset-4 transition hover:decoration-accent dark:text-white/80 dark:decoration-white/30"
                  >
                    {lang === "en" ? "Try a demo case" : "डेमो केस आज़माएँ"}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <ul>
                  {entries.slice(0, 3).map((e) => (
                    <li key={e.id} className="ledger-row items-center">
                      <Clock3 className="mt-0.5 h-3 w-3 shrink-0 text-ink-faint dark:text-white/25" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink dark:text-white/85">
                          {e.moduleLabel}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] text-ink-faint dark:text-white/30">
                          {e.id} · {timeAgo(e.at)} {lang === "en" ? "ago" : "पहले"}
                        </p>
                      </div>
                      <span
                        className={clsx(
                          "shrink-0 font-mono text-2xs uppercase tracking-wider",
                          verdictTone[e.verdict]
                        )}
                      >
                        {verdictWord[e.verdict][lang]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-rule bg-paper-sunk/60 px-4 py-2.5 dark:border-dark-border dark:bg-white/[0.03]">
              <Command className="h-3 w-3 text-ink-faint dark:text-white/30" />
              <button
                onClick={onOpenPalette}
                className="flex flex-1 items-center gap-2 text-left text-[11px] text-ink-muted transition hover:text-ink dark:text-white/40 dark:hover:text-white/80"
              >
                {lang === "en" ? "Jump anywhere" : "कहीं भी जाएँ"}
                <kbd className="ml-auto rounded border border-rule bg-card px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-ink-faint dark:border-white/15 dark:bg-transparent dark:text-white/40">
                  ⌘K
                </kbd>
              </button>
            </div>
          </div>

          {/* Helpline — the most useful thing on this page */}
          <div className="reveal reveal-3 mt-4 overflow-hidden rounded-xl border border-ink/10 bg-ink text-paper dark:border-white/10">
            <div className="flex items-start gap-3 px-4 py-4">
              <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-paper/70" strokeWidth={1.6} />
              <div className="min-w-0">
                <p className="font-mono text-2xs uppercase tracking-eyebrow text-paper/45">
                  {lang === "en" ? "Money already gone?" : "पैसे जा चुके हैं?"}
                </p>
                <p className="mt-1 font-display text-[17px] leading-snug">
                  {lang === "en"
                    ? "Report inside the first hour. Recovery odds fall fast after that."
                    : "पहले घंटे में शिकायत दर्ज करें। इसके बाद रिकवरी की संभावना तेज़ी से घटती है।"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px]">
                  <a href="tel:1930" className="underline decoration-paper/30 underline-offset-4 hover:decoration-paper">
                    1930 {lang === "en" ? "cyber helpline" : "साइबर हेल्पलाइन"}
                  </a>
                  <a href="tel:112" className="underline decoration-paper/30 underline-offset-4 hover:decoration-paper">
                    112
                  </a>
                  <a
                    href="https://cybercrime.gov.in"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline decoration-paper/30 underline-offset-4 hover:decoration-paper"
                  >
                    cybercrime.gov.in <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══════════ INSTRUMENT INDEX ═══════════ */}
      <section className="mt-14">
        <div className="flex items-end justify-between gap-4 border-b border-ink/15 pb-2 dark:border-white/15">
          <h2 className="font-display text-[22px] font-normal text-ink dark:text-white">
            {lang === "en" ? "The instruments" : "यंत्र"}
          </h2>
          <span className="hidden pb-1 font-mono text-2xs uppercase tracking-eyebrow text-ink-faint sm:block dark:text-white/30">
            {lang === "en" ? "Numbered, one job each" : "क्रमांकित, हर एक का एक काम"}
          </span>
        </div>

        <ol>
          {MODULES.map((m, i) => {
            const Icon = m.icon;
            return (
              <li
                key={m.id}
                className={clsx("border-b border-rule dark:border-white/10", "reveal", `reveal-${Math.min(i + 1, 5)}`)}
              >
                <button
                  onClick={() => onOpenModule(m.id)}
                  className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-start gap-x-3 gap-y-2 py-5 text-left transition-colors hover:bg-card/60 dark:hover:bg-white/[0.03] sm:grid-cols-[3.5rem_1fr_auto] sm:gap-x-6 sm:px-2"
                >
                  <span className="pt-1 font-mono text-[11px] tabular-nums text-ink-faint transition-colors group-hover:text-accent dark:text-white/30">
                    {m.no}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        className="h-[15px] w-[15px] text-ink-muted transition-colors group-hover:text-ink dark:text-white/45 dark:group-hover:text-white"
                        strokeWidth={1.7}
                      />
                      <h3 className="font-display text-[19px] leading-tight text-ink transition-transform duration-300 group-hover:translate-x-0.5 dark:text-white sm:text-[21px]">
                        {lang === "en" ? m.label : m.labelHi}
                      </h3>
                    </div>
                    <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-muted dark:text-white/45 text-pretty">
                      {lang === "en" ? m.blurb : m.blurbHi}
                    </p>
                    <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-ink-faint dark:text-white/25">
                      <span>{m.method}</span>
                      <span className="h-2.5 w-px bg-rule-strong/70" aria-hidden />
                      <span>{m.accepts}</span>
                    </p>
                  </div>

                  <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-rule text-ink-faint transition-all duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-paper dark:border-white/15 dark:text-white/40 dark:group-hover:border-white dark:group-hover:bg-white dark:group-hover:text-ink">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ═══════════ HOUSE RULES ═══════════ */}
      <section className="mt-14 grid gap-6 border-t border-ink/15 pt-8 dark:border-white/15 md:grid-cols-[200px_1fr]">
        <h2 className="font-display text-[22px] font-normal leading-tight text-ink dark:text-white">
          {lang === "en" ? (
            <>
              Three rules
              <br />
              <span className="text-ink-faint dark:text-white/35">before any payment.</span>
            </>
          ) : (
            <>
              कोई भी भुगतान
              <br />
              <span className="text-ink-faint dark:text-white/35">से पहले तीन नियम।</span>
            </>
          )}
        </h2>
        <ol className="grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {[
            {
              en: "Never share an OTP, PIN or screen. A bank will never ask.",
              hi: "कभी OTP, पिन या स्क्रीन साझा न करें। बैंक कभी नहीं माँगता।",
            },
            {
              en: "A QR that 'receives' money never needs your PIN to be entered.",
              hi: "पैसे 'प्राप्त' करने वाले QR में पिन कभी दर्ज नहीं होता।",
            },
            {
              en: "Money received is confirmed in your own app — not in their screenshot.",
              hi: "पैसा आपके ऐप में दिखे, किसी के स्क्रीनशॉट में नहीं।",
            },
          ].map((r, i) => (
            <li key={i}>
              <span className="font-mono text-2xs text-accent">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft dark:text-white/60 text-pretty">
                {lang === "en" ? r.en : r.hi}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ═══════════ COLOPHON ═══════════ */}
      <footer className="mt-14 flex flex-col gap-2 border-t border-rule pt-5 font-mono text-2xs uppercase tracking-wider text-ink-faint sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-white/25">
        <span>
          SatyaKavach · {lang === "en" ? "forensic aid, not legal advice" : "फॉरेंसिक सहायता, कानूनी सलाह नहीं"}
        </span>
        <span className="flex items-center gap-3">
          <ShieldCheck className="h-3 w-3" />
          <span>{lang === "en" ? "Evidence exported as hashed JSON" : "साक्ष्य हैश्ड JSON में निर्यात"}</span>
          <CornerDownLeft className="hidden h-3 w-3 sm:block" />
        </span>
      </footer>
    </div>
  );
}
