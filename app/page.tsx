"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import {
  ShieldCheck,
  Home,
  Moon,
  Sun,
  Search,
  BookOpen,
  Command,
  LifeBuoy,
} from "lucide-react";

import UPIInspector from "@/components/modules/UPIInspector";
import QRScanner from "@/components/modules/QRScanner";
import JobScreener from "@/components/modules/JobScreener";
import DeepfakeInspector from "@/components/modules/DeepfakeInspector";
import DocumentInspector from "@/components/modules/DocumentInspector";
import KavachCopilot from "@/components/KavachCopilot";
import TriageHome from "@/components/TriageHome";
import CommandPalette from "@/components/CommandPalette";
import LedgerDrawer from "@/components/LedgerDrawer";
import { MODULES, moduleById, type ModuleId } from "@/lib/modules";
import { addEntry, listLedger, subscribeLedger, type LedgerEntry } from "@/lib/ledger";

type View = ModuleId | "home";

export default function WorkbenchShell() {
  const [view, setView] = useState<View>("home");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const viewRef = useRef<View>("home");

  viewRef.current = view;

  /* ── Ledger subscription ─────────────────────────────── */
  useEffect(() => {
    setEntries(listLedger());
    return subscribeLedger(() => setEntries(listLedger()));
  }, []);

  /* ── Theme & language preference ─────────────────────── */
  useEffect(() => {
    const stored = localStorage.getItem("sk.theme");
    const prefersDark =
      !stored && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(stored ? stored === "dark" : prefersDark);
    setLang((localStorage.getItem("sk.lang") as "en" | "hi") || "en");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("sk.theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("sk.lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);

  /* ── Global shortcuts ────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const inField =
        e.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        return;
      }
      if (inField || mod || e.altKey) return;

      if (e.key === "l") setLedgerOpen(true);
      if (e.key === "t") setDark((d) => !d);
      if (e.key === "h") setView("home");
      if (/^[1-5]$/.test(e.key)) setView(MODULES[Number(e.key) - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── Write to the evidence ledger ────────────────────── */
  const recordAudit = useCallback((report?: any, meta?: { demo?: boolean }) => {
    const current = viewRef.current;
    if (current === "home") return;
    addEntry(current, report, { demo: meta?.demo });
  }, []);

  const current = view === "home" ? null : moduleById(view);

  return (
    <div className="min-h-dvh text-ink dark:text-white">
      {/* ══════════ RAIL (desktop) ══════════ */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-[80px] flex-col items-center border-r border-rule bg-paper/80 backdrop-blur-sm lg:flex dark:border-dark-border dark:bg-dark-surface/80">
        <button
          onClick={() => setView("home")}
          className="grid h-[56px] w-full place-items-center border-b border-rule dark:border-dark-border"
          aria-label="SatyaKavach home"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-ink text-paper transition-transform duration-300 hover:-rotate-3 dark:bg-paper dark:text-ink">
            <ShieldCheck className="h-[17px] w-[17px]" strokeWidth={1.8} />
          </span>
        </button>

        <nav className="flex w-full flex-1 flex-col items-center gap-1 py-3">
          <RailButton
            active={view === "home"}
            label={lang === "en" ? "Desk" : "डेस्क"}
            onClick={() => setView("home")}
            icon={<Home className="h-[17px] w-[17px]" strokeWidth={1.7} />}
          />
          <div className="my-2 h-px w-8 bg-rule dark:bg-dark-border" />
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <RailButton
                key={m.id}
                active={view === m.id}
                label={lang === "en" ? m.no : m.no}
                title={lang === "en" ? m.label : m.labelHi}
                onClick={() => setView(m.id)}
                icon={<Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />}
              />
            );
          })}
        </nav>

        <div className="flex w-full flex-col items-center gap-1 border-t border-rule py-3 dark:border-dark-border">
          <RailButton
            label="1930"
            title={lang === "en" ? "Cyber helpline" : "साइबर हेल्पलाइन"}
            onClick={() => window.open("tel:1930")}
            icon={<LifeBuoy className="h-[17px] w-[17px]" strokeWidth={1.7} />}
          />
          <span className="mt-1 font-mono text-[9px] tracking-widest text-ink-faint dark:text-white/20">
            v1.0
          </span>
        </div>
      </aside>

      {/* ══════════ COLUMN ══════════ */}
      <div className="lg:pl-[80px]">
        {/* ── Top bar ── */}
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule bg-paper/85 px-4 backdrop-blur-md sm:px-6 dark:border-dark-border dark:bg-dark-surface/85">
          {/* Mobile brand */}
          <button onClick={() => setView("home")} className="flex items-center gap-2 lg:hidden">
            <span className="grid h-7 w-7 place-items-center rounded bg-ink text-paper dark:bg-paper dark:text-ink">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </span>
            <span className="font-display text-[15px] leading-none text-ink dark:text-white">
              SatyaKavach
            </span>
          </button>

          {/* Desktop context */}
          <div className="hidden min-w-0 items-baseline gap-2.5 lg:flex">
            <span className="font-mono text-[10px] uppercase tracking-eyebrow text-ink-faint dark:text-white/30">
              {view === "home" ? "Intake desk" : `Instrument ${current?.no}`}
            </span>
            <span className="h-3 w-px bg-rule-strong dark:bg-white/15" aria-hidden />
            <button
              onClick={() => setView("home")}
              className="max-w-[38vw] truncate font-display text-[16px] leading-none text-ink transition-colors hover:text-accent dark:text-white dark:hover:text-accent"
              title={lang === "en" ? "Back to the intake desk" : "इनटेक डेस्क पर लौटें"}
            >
              {view === "home"
                ? lang === "en"
                  ? "Everything that was sent to you"
                  : "जो कुछ आपको भेजा गया"
                : lang === "en"
                ? current?.label
                : current?.labelHi}
            </button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="group hidden items-center gap-2 rounded-md border border-rule bg-card/70 px-2.5 py-1.5 text-ink-muted transition hover:border-rule-strong hover:text-ink sm:flex dark:border-dark-border dark:bg-white/[0.03] dark:text-white/45 dark:hover:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px] uppercase tracking-wider">
                {lang === "en" ? "Jump" : "जाएँ"}
              </span>
              <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-rule px-1 py-0.5 font-mono text-[9px] text-ink-faint md:flex dark:border-white/15 dark:text-white/30">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            {/* Engine status */}
            <div className="hidden items-center gap-1.5 border-l border-rule pl-3 xl:flex dark:border-dark-border">
              <span className="h-1.5 w-1.5 rounded-full bg-trust shadow-[0_0_0_3px_rgba(18,113,91,0.12)]" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted dark:text-white/40">
                {lang === "en" ? "Engine ready" : "इंजन तैयार"}
              </span>
            </div>

            {/* Language segmented control */}
            <div className="flex items-center rounded-md border border-rule p-0.5 dark:border-dark-border">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={clsx(
                    "rounded px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
                    lang === l
                      ? "bg-ink text-paper dark:bg-paper dark:text-ink"
                      : "text-ink-muted hover:text-ink dark:text-white/40 dark:hover:text-white"
                  )}
                  aria-pressed={lang === l}
                >
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>

            <button
              onClick={() => setLedgerOpen(true)}
              className="relative grid h-8 w-8 place-items-center rounded-md border border-rule text-ink-muted transition hover:border-rule-strong hover:text-ink dark:border-dark-border dark:text-white/45 dark:hover:text-white"
              aria-label="Evidence ledger"
            >
              <BookOpen className="h-4 w-4" strokeWidth={1.7} />
              {entries.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 font-mono text-[9px] font-semibold text-white">
                  {entries.length > 99 ? "99" : entries.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setDark((d) => !d)}
              className="grid h-8 w-8 place-items-center rounded-md border border-rule text-ink-muted transition hover:border-rule-strong hover:text-ink dark:border-dark-border dark:text-white/45 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-4 w-4" strokeWidth={1.7} /> : <Moon className="h-4 w-4" strokeWidth={1.7} />}
            </button>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain pb-16 lg:pb-0">
          {view === "home" && (
            <TriageHome
              lang={lang}
              entries={entries}
              onOpenModule={setView}
              onOpenLedger={() => setLedgerOpen(true)}
              onOpenPalette={() => setPaletteOpen(true)}
            />
          )}
          {view === "upi" && <UPIInspector lang={lang} onAuditComplete={recordAudit} />}
          {view === "qr" && <QRScanner lang={lang} onAuditComplete={recordAudit} />}
          {view === "job" && <JobScreener lang={lang} onAuditComplete={recordAudit} />}
          {view === "deepfake" && (
            <DeepfakeInspector lang={lang} onAuditComplete={recordAudit} />
          )}
          {view === "document" && (
            <DocumentInspector lang={lang} onAuditComplete={recordAudit} />
          )}
        </main>
      </div>

      {/* ══════════ MOBILE TAB BAR ══════════ */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-rule bg-paper/95 backdrop-blur-md lg:hidden dark:border-dark-border dark:bg-dark-surface/95">
        <MobileTab
          active={view === "home"}
          onClick={() => setView("home")}
          label={lang === "en" ? "Desk" : "डेस्क"}
          icon={<Home className="h-[18px] w-[18px]" strokeWidth={1.7} />}
        />
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <MobileTab
              key={m.id}
              active={view === m.id}
              onClick={() => setView(m.id)}
              label={m.no}
              icon={<Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />}
            />
          );
        })}
      </nav>

      {/* ══════════ OVERLAYS ══════════ */}
      <KavachCopilot lang={lang} activeTab={view === "home" ? "upi" : view} onSelectTab={(id) => setView(id as View)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        lang={lang}
        dark={dark}
        onSelectModule={(id) => setView(id)}
        onOpenLedger={() => setLedgerOpen(true)}
        onToggleTheme={() => setDark((d) => !d)}
        onToggleLang={() => setLang((l) => (l === "en" ? "hi" : "en"))}
      />

      <LedgerDrawer
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        entries={entries}
        lang={lang}
        onOpenModule={setView}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Rail button
───────────────────────────────────────────── */
function RailButton({
  icon,
  label,
  title,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group relative flex w-[56px] flex-col items-center gap-1 rounded-md py-2 transition-all duration-200",
        active
          ? "bg-ink text-paper shadow-card dark:bg-white/10 dark:text-white"
          : "text-ink-faint hover:bg-paper-sunk/70 hover:text-ink dark:text-white/35 dark:hover:bg-white/5 dark:hover:text-white"
      )}
    >
      <span
        className={clsx(
          "absolute left-[-12px] top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-accent transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      {icon}
      <span className="font-mono text-[9px] uppercase tracking-wider">{label}</span>
    </button>
  );
}

function MobileTab({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-ink dark:text-white" : "text-ink-faint dark:text-white/35"
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && <span className="absolute top-0 h-[2px] w-6 rounded-full bg-accent" />}
      {icon}
      <span className="font-mono text-[9px] uppercase tracking-wider">{label}</span>
    </button>
  );
}
