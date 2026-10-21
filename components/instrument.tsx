"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

/* ═════════════════════════════════════════════
   Shared instrument chrome.
   Every module wears the same masthead so the
   five tools read as one instrument family.
   ═════════════════════════════════════════════ */

export function InstrumentHeader({
  no,
  note,
  title,
  methods,
  actions,
}: {
  no: string;
  note?: string;
  title: React.ReactNode;
  methods: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink/15 pb-4 dark:border-white/15">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/30">
          <span className="text-accent">Instrument {no}</span>
          {note && (
            <>
              <span className="h-2.5 w-px bg-rule-strong/80 dark:bg-white/20" aria-hidden />
              <span>{note}</span>
            </>
          )}
        </p>
        <h1 className="mt-2 max-w-[46ch] font-display text-[clamp(1.35rem,2.1vw,1.8rem)] font-normal leading-[1.12] tracking-tightest text-ink text-balance dark:text-white">
          {title}
        </h1>
        <p className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-ink-faint dark:text-white/25">
          {methods}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ── Corner ticks used on intake frames ── */
export function CornerTicks({ tone = "faint" }: { tone?: "faint" | "accent" }) {
  const c = tone === "accent" ? "border-accent/70" : "border-ink-faint/50 dark:border-white/20";
  return (
    <>
      <span className={clsx("pointer-events-none absolute left-2 top-2 h-2.5 w-2.5 border-l border-t", c)} />
      <span className={clsx("pointer-events-none absolute right-2 top-2 h-2.5 w-2.5 border-r border-t", c)} />
      <span className={clsx("pointer-events-none absolute bottom-2 left-2 h-2.5 w-2.5 border-b border-l", c)} />
      <span className={clsx("pointer-events-none absolute bottom-2 right-2 h-2.5 w-2.5 border-b border-r", c)} />
    </>
  );
}

/* ── Findings pane before anything has run ── */
export function AwaitingFindings({
  icon: Icon,
  title,
  body,
  steps,
  className,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  steps?: string[];
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "relative flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-rule-strong/70 px-6 py-12 text-center dark:border-white/12",
        className
      )}
    >
      <CornerTicks />
      <span className="grid h-10 w-10 place-items-center rounded-md border border-rule bg-card text-ink-faint dark:border-white/15 dark:bg-white/[0.03] dark:text-white/30">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </span>
      <p className="mt-4 font-display text-[18px] leading-snug text-ink dark:text-white">{title}</p>
      <p className="mt-1.5 max-w-[38ch] text-[12.5px] leading-relaxed text-ink-muted dark:text-white/40 text-pretty">
        {body}
      </p>
      {!!steps?.length && (
        <ol className="mt-6 w-full max-w-[300px] space-y-2 text-left">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 border-t border-dashed border-rule pt-2 text-[11.5px] leading-snug text-ink-muted first:border-0 first:pt-0 dark:border-white/10 dark:text-white/40"
            >
              <span className="font-mono text-[9px] text-accent">{String(i + 1).padStart(2, "0")}</span>
              {s}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── A panel with a mono eyebrow header ── */
export function Panel({
  label,
  right,
  children,
  className,
  bodyClassName,
}: {
  label: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={clsx(
        "overflow-hidden rounded-xl border border-rule bg-card dark:border-dark-border dark:bg-dark-card",
        className
      )}
    >
      <header className="flex min-h-[38px] items-center justify-between gap-3 border-b border-rule/80 px-3.5 py-2 dark:border-white/10">
        <p className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/35">
          {label}
        </p>
        {right}
      </header>
      <div className={clsx("p-3.5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── "Start here" hint row ── */
export function HintRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 border-l-2 border-rule-strong pl-2.5 text-[11px] leading-relaxed text-ink-muted dark:border-white/20 dark:text-white/40">
      {children}
    </p>
  );
}

export function ArrowGlyph() {
  return <ArrowRight className="h-3.5 w-3.5" />;
}
