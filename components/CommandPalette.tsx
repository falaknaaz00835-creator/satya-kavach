"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Search,
  ArrowRight,
  Moon,
  Sun,
  Globe2,
  BookOpen,
  Home,
  ShieldQuestion,
  CornerDownLeft,
} from "lucide-react";
import { MODULES, type ModuleId } from "@/lib/modules";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  lang: "en" | "hi";
  dark: boolean;
  onSelectModule: (id: ModuleId | "home") => void;
  onOpenLedger: () => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
}

interface Item {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon: typeof Search;
  keywords: string;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
  lang,
  dark,
  onSelectModule,
  onOpenLedger,
  onToggleTheme,
  onToggleLang,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items: Item[] = useMemo(
    () => [
      {
        id: "home",
        label: lang === "en" ? "Intake desk" : "इनटेक डेस्क",
        hint: "H",
        group: lang === "en" ? "Navigate" : "नेविगेट",
        icon: Home,
        keywords: "home desk start intake upload",
        run: () => onSelectModule("home"),
      },
      ...MODULES.map((m, i) => ({
        id: m.id,
        label: lang === "en" ? m.label : m.labelHi,
        hint: String(i + 1),
        group: lang === "en" ? "Instruments" : "यंत्र",
        icon: m.icon,
        keywords: `${m.method} ${m.id} ${m.label} ${m.labelHi}`,
        run: () => onSelectModule(m.id),
      })),
      {
        id: "ledger",
        label: lang === "en" ? "Evidence ledger" : "साक्ष्य लेजर",
        hint: "L",
        group: lang === "en" ? "Actions" : "क्रियाएँ",
        icon: BookOpen,
        keywords: "ledger log history export evidence",
        run: onOpenLedger,
      },
      {
        id: "theme",
        label: dark
          ? lang === "en"
            ? "Switch to daylight"
            : "दिन का रूप"
          : lang === "en"
          ? "Switch to night desk"
          : "रात का रूप",
        hint: "T",
        group: lang === "en" ? "Actions" : "क्रियाएँ",
        icon: dark ? Sun : Moon,
        keywords: "theme dark light mode night",
        run: onToggleTheme,
      },
      {
        id: "lang",
        label: lang === "en" ? "भाषा — हिंदी में बदलें" : "Language — switch to English",
        group: lang === "en" ? "Actions" : "क्रियाएँ",
        icon: Globe2,
        keywords: "language hindi english bhasha",
        run: onToggleLang,
      },
    ],
    [lang, dark, onSelectModule, onOpenLedger, onToggleTheme, onToggleLang]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.keywords.toLowerCase().includes(q) ||
        i.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const chosen = filtered[active];
        if (chosen) {
          chosen.run();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div
        className="fade-in absolute inset-0 bg-ink/25 backdrop-blur-[2px] dark:bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="pop relative w-full max-w-[560px] overflow-hidden rounded-xl border border-ink/15 bg-card shadow-lift dark:border-white/15 dark:bg-dark-card"
      >
        <div className="flex items-center gap-3 border-b border-rule px-4 dark:border-dark-border">
          <Search className="h-4 w-4 shrink-0 text-ink-faint dark:text-white/35" />
          <input
            ref={inputRef}
            aria-label={lang === "en" ? "Search commands" : "कमांड खोजें"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === "en"
                ? "Jump to an instrument or run a command…"
                : "यंत्र खोलें या कमांड चलाएँ…"
            }
            className="w-full bg-transparent py-4 text-sm text-ink outline-none placeholder:text-ink-faint dark:text-white dark:placeholder:text-white/30"
          />
          <kbd className="hidden rounded border border-rule px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint sm:block dark:border-white/15 dark:text-white/35">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <ShieldQuestion className="h-5 w-5 text-ink-faint dark:text-white/30" />
              <p className="text-sm text-ink-muted dark:text-white/50">
                {lang === "en" ? "Nothing matches that." : "इससे कुछ मेल नहीं खाता।"}
              </p>
            </div>
          )}

          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && (
                  <p className="px-2 pb-1 pt-3 font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/25">
                    {item.group}
                  </p>
                )}
                <button
                  data-idx={idx}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors",
                    active === idx
                      ? "bg-ink text-paper dark:bg-white dark:text-ink"
                      : "text-ink-soft hover:bg-paper-sunk dark:text-white/70 dark:hover:bg-white/5"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4 shrink-0",
                      active === idx ? "opacity-90" : "text-ink-faint dark:text-white/35"
                    )}
                    strokeWidth={1.7}
                  />
                  <span className="flex-1 truncate text-[13px] font-medium">{item.label}</span>
                  {item.hint && (
                    <span
                      className={clsx(
                        "font-mono text-[9px] uppercase tracking-wider",
                        active === idx ? "opacity-60" : "text-ink-faint dark:text-white/25"
                      )}
                    >
                      {item.hint}
                    </span>
                  )}
                  {active === idx && <ArrowRight className="h-3.5 w-3.5 opacity-70" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-rule bg-paper-sunk/50 px-4 py-2 dark:border-dark-border dark:bg-white/[0.03]">
          {[
            ["↑↓", lang === "en" ? "move" : "चलें"],
            ["↵", lang === "en" ? "open" : "खोलें"],
          ].map(([key, label]) => (
            <span
              key={key}
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/30"
            >
              <kbd className="rounded border border-rule px-1 py-0.5 dark:border-white/15">{key}</kbd>
              {label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:text-white/25">
            <CornerDownLeft className="h-3 w-3" /> SatyaKavach
          </span>
        </div>
      </div>
    </div>
  );
}
