"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  ShieldCheck,
  QrCode,
  BriefcaseBusiness,
  Video,
  FileSearch,
  Camera,
  Share2,
  Moon,
  Sun,
  Globe2,
  Clock,
  Sparkles,
  CornerDownLeft,
  X,
  Zap,
} from "lucide-react";
import clsx from "clsx";

export interface CommandItem {
  id: string;
  title: string;
  titleHi: string;
  subtitle: string;
  category: "Modules" | "Actions" | "Preferences";
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "en" | "hi";
  onSelectModule: (moduleId: string) => void;
  onOpenAR: () => void;
  onOpenShareShield: () => void;
  onToggleDark: () => void;
  onToggleLang: () => void;
  isDark: boolean;
  auditCount: number;
}

export default function CommandPalette({
  isOpen,
  onClose,
  lang,
  onSelectModule,
  onOpenAR,
  onOpenShareShield,
  onToggleDark,
  onToggleLang,
  isDark,
  auditCount,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Command items configuration
  const commands: CommandItem[] = [
    {
      id: "mod-upi",
      title: "UPI & Payment Screenshot Forensics",
      titleHi: "UPI व भुगतान स्क्रीनशॉट जांच",
      subtitle: "Detect fake receipts, UTR math tampering & font anomalies",
      category: "Modules",
      icon: ShieldCheck,
      badge: "Module 1",
      shortcut: "1",
      action: () => {
        onSelectModule("upi");
        onClose();
      },
    },
    {
      id: "mod-qr",
      title: "QR Code & Trap-Link Scanner",
      titleHi: "QR कोड व जालसाजी लिंक स्कैनर",
      subtitle: "Inspect suspicious QR payloads, shortlinks & mode=02 collect scams",
      category: "Modules",
      icon: QrCode,
      badge: "Module 2",
      shortcut: "2",
      action: () => {
        onSelectModule("qr");
        onClose();
      },
    },
    {
      id: "mod-job",
      title: "Job Offer & Internship Screener",
      titleHi: "नौकरी ऑफर व इंटर्नशिप जांच",
      subtitle: "Screen fake appointment letters & registration fee scams",
      category: "Modules",
      icon: BriefcaseBusiness,
      badge: "Module 3",
      shortcut: "3",
      action: () => {
        onSelectModule("job");
        onClose();
      },
    },
    {
      id: "mod-deepfake",
      title: "Deepfake & Face-Swap Inspector",
      titleHi: "डीपफेक व चेहरा-बदल जांच",
      subtitle: "Audit video frames for synthetic AI artifacts and blur boundaries",
      category: "Modules",
      icon: Video,
      badge: "Module 4",
      shortcut: "4",
      action: () => {
        onSelectModule("deepfake");
        onClose();
      },
    },
    {
      id: "mod-document",
      title: "Document & Invoice Forensics",
      titleHi: "दस्तावेज़ व चालान फॉरेंसिक्स",
      subtitle: "Inspect altered PDF bills, GSTIN numbers & official certificates",
      category: "Modules",
      icon: FileSearch,
      badge: "Module 5",
      shortcut: "5",
      action: () => {
        onSelectModule("document");
        onClose();
      },
    },
    {
      id: "act-ar",
      title: "Launch Live AR Camera Viewfinder",
      titleHi: "लाइव AR कैमरा स्कैनर चालू करें",
      subtitle: "Point camera at screens or physical documents for live HUD targeting",
      category: "Actions",
      icon: Camera,
      badge: "Live HUD",
      shortcut: "A",
      action: () => {
        onClose();
        onOpenAR();
      },
    },
    {
      id: "act-shield",
      title: "Open Family Shield & Viral Share Drawer",
      titleHi: "फ़ैमिली शील्ड व सुरक्षा अलर्ट साझा करें",
      subtitle: "Generate 9:16 Instagram Story & WhatsApp forward scam bulletins",
      category: "Actions",
      icon: Share2,
      badge: "Viral Alert",
      shortcut: "S",
      action: () => {
        onClose();
        onOpenShareShield();
      },
    },
    {
      id: "pref-dark",
      title: isDark ? "Switch to Light Mode" : "Switch to Dark Mode",
      titleHi: isDark ? "लाइट मोड पर स्विच करें" : "डार्क मोड पर स्विच करें",
      subtitle: "Toggle high-contrast theme aesthetics",
      category: "Preferences",
      icon: isDark ? Sun : Moon,
      shortcut: "T",
      action: () => {
        onToggleDark();
      },
    },
    {
      id: "pref-lang",
      title: lang === "en" ? "भाषा बदलें: हिंदी" : "Change Language: English",
      titleHi: lang === "en" ? "Switch to Hindi" : "अंग्रेज़ी में बदलें",
      subtitle: "Switch UI between English and हिन्दी",
      category: "Preferences",
      icon: Globe2,
      shortcut: "L",
      action: () => {
        onToggleLang();
      },
    },
  ];

  // Filter commands by search query
  const filtered = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.titleHi.toLowerCase().includes(q) ||
      cmd.subtitle.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev - 1 < 0 ? (filtered.length || 1) - 1 : prev - 1
        );
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [filtered, selectedIndex, onClose]
  );

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-md transition-opacity duration-200 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white/90 dark:bg-[#111622]/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 scale-100 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar (Apple Spotlight style) */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 dark:border-white/10">
          <Search className="w-5 h-5 text-indigo-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={
              lang === "en"
                ? "Type a command, module, or search action... (Press ESC to close)"
                : "कमांड, मॉड्यूल या क्रिया खोजें... (बंद करने के लिए ESC दबाएं)"
            }
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 divide-y divide-transparent"
        >
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {lang === "en" ? "No matching commands found" : "कोई परिणाम नहीं मिला"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {lang === "en"
                  ? "Try searching for 'UPI', 'QR', 'Camera', or 'Theme'"
                  : "'UPI', 'QR', 'कैमरा' आदि खोजें"}
              </p>
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-index={idx}
                  onClick={() => cmd.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    "flex items-center gap-3.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                  )}
                >
                  <div
                    className={clsx(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate">
                        {lang === "en" ? cmd.title : cmd.titleHi}
                      </span>
                      {cmd.badge && (
                        <span
                          className={clsx(
                            "px-1.5 py-0.2 rounded text-[10px] font-mono tracking-tight",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400"
                          )}
                        >
                          {cmd.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className={clsx(
                        "text-[11px] truncate mt-0.5",
                        isSelected
                          ? "text-white/80"
                          : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {cmd.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cmd.shortcut && (
                      <kbd
                        className={clsx(
                          "hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded",
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
                        )}
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-white/90 animate-pulse" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-200/80 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[9px] font-mono bg-slate-200 dark:bg-white/10 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 text-[9px] font-mono bg-slate-200 dark:bg-white/10 rounded">↓</kbd>
              <span>{lang === "en" ? "Navigate" : "नेविगेट"}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[9px] font-mono bg-slate-200 dark:bg-white/10 rounded">↵</kbd>
              <span>{lang === "en" ? "Execute" : "चुनें"}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-mono text-[10px]">
            <Zap className="w-3 h-3" />
            <span>SatyaKavach Spotlight</span>
          </div>
        </div>
      </div>
    </div>
  );
}
