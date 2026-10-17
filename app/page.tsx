"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  ShieldCheck,
  QrCode,
  BriefcaseBusiness,
  Video,
  FileSearch,
  Clock,
  ChevronRight,
  Moon,
  Sun,
  Globe2,
  Menu,
  X,
  Activity,
  BookOpen,
} from "lucide-react";
import UPIInspector from "@/components/modules/UPIInspector";
import QRScanner from "@/components/modules/QRScanner";

/* ─────────────────────────────────────────
   Navigation module definitions
───────────────────────────────────────── */
const MODULES = [
  {
    id: "upi",
    label: "UPI Screenshot",
    labelHi: "UPI स्क्रीनशॉट",
    icon: ShieldCheck,
    status: "live" as const,
    description: "Fake payment screenshot detector",
  },
  {
    id: "qr",
    label: "QR & Link Scanner",
    labelHi: "QR व लिंक स्कैनर",
    icon: QrCode,
    status: "live" as const,
    description: "Malicious QR & trap-link scanner",
  },
  {
    id: "job",
    label: "Job Offer Screener",
    labelHi: "नौकरी ऑफर जांच",
    icon: BriefcaseBusiness,
    status: "coming" as const,
    description: "Fake offer letter screener",
  },
  {
    id: "deepfake",
    label: "Deepfake Inspector",
    labelHi: "डीपफेक जांच",
    icon: Video,
    status: "coming" as const,
    description: "Video & face-swap forensics",
  },
  {
    id: "document",
    label: "Document Forensics",
    labelHi: "दस्तावेज़ जांच",
    icon: FileSearch,
    status: "coming" as const,
    description: "Tampered bill & document inspector",
  },
];

/* ─────────────────────────────────────────
   Audit counter (session-local)
───────────────────────────────────────── */
function useAuditCounter() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const stored = parseInt(sessionStorage.getItem("sk_audits") ?? "0", 10);
    setCount(stored);
  }, []);

  const increment = () => {
    setCount((c) => {
      const next = c + 1;
      sessionStorage.setItem("sk_audits", String(next));
      return next;
    });
  };

  return { count, increment };
}

/* ─────────────────────────────────────────
   Workbench Shell
───────────────────────────────────────── */
export default function WorkbenchShell() {
  const [activeModule, setActiveModule] = useState("upi");
  const [dark, setDark] = useState(false);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const { count: auditCount, increment: recordAudit } = useAuditCounter();

  /* Toggle dark class on <html> */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const currentModule = MODULES.find((m) => m.id === activeModule)!;

  return (
    <div className="flex h-screen overflow-hidden bg-surface dark:bg-dark-surface">
      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          "flex flex-col border-r border-border dark:border-dark-border bg-card dark:bg-dark-card transition-all duration-200 shrink-0",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border dark:border-dark-border h-14 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-ink dark:bg-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-white dark:text-dark-surface" />
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink dark:text-white leading-none truncate">
                SatyaKavach
              </p>
              <p className="text-[10px] text-ink-faint dark:text-slate-500 leading-none mt-0.5 font-mono truncate">
                सत्य कवच v1.0
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((s) => !s)}
            className="ml-auto text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white transition-colors shrink-0"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-faint dark:text-slate-600">
              {lang === "en" ? "Forensic Modules" : "फॉरेंसिक मॉड्यूल"}
            </p>
          )}
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isActive = activeModule === mod.id;
            const isLive = mod.status === "live";

            return (
              <button
                key={mod.id}
                onClick={() => isLive && setActiveModule(mod.id)}
                className={clsx(
                  "sk-nav-item w-full text-left",
                  isActive && "active",
                  !isLive && "opacity-40 cursor-not-allowed"
                )}
                disabled={!isLive}
                title={!sidebarOpen ? (lang === "en" ? mod.label : mod.labelHi) : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">
                      {lang === "en" ? mod.label : mod.labelHi}
                    </span>
                    {!isActive && !isLive && (
                      <span className="text-[10px] text-ink-faint dark:text-slate-600 font-normal">
                        Coming soon
                      </span>
                    )}
                  </span>
                )}
                {sidebarOpen && isLive && !isActive && (
                  <span className="text-[10px] font-semibold text-trust bg-trust-bg px-1.5 py-0.5 rounded-full shrink-0">
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Saved audit log button */}
        <div className="border-t border-border dark:border-dark-border px-2 py-2 shrink-0">
          <button
            onClick={() => setLogOpen(true)}
            className="sk-nav-item w-full"
            title={!sidebarOpen ? "Audit Log" : undefined}
          >
            <Clock className="w-4 h-4 shrink-0" />
            {sidebarOpen && (
              <span className="flex-1 truncate">
                {lang === "en" ? "Audit Log" : "ऑडिट लॉग"}
              </span>
            )}
            {sidebarOpen && auditCount > 0 && (
              <span className="text-[10px] font-bold bg-ink text-white dark:bg-white dark:text-dark-surface px-1.5 py-0.5 rounded-full shrink-0">
                {auditCount}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top status bar */}
        <header className="h-14 shrink-0 border-b border-border dark:border-dark-border bg-card dark:bg-dark-card flex items-center gap-4 px-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-ink-muted dark:text-slate-400 shrink-0">Workbench</span>
            <ChevronRight className="w-3.5 h-3.5 text-ink-faint dark:text-slate-600 shrink-0" />
            <span className="font-semibold text-ink dark:text-white truncate">
              {lang === "en" ? currentModule.label : currentModule.labelHi}
            </span>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trust opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-trust" />
            </span>
            <span className="text-xs text-trust font-medium">
              {lang === "en" ? "Live Forensics" : "लाइव जांच"}
            </span>
          </div>

          {/* Audit counter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-ink-muted dark:text-slate-400 border-l border-border dark:border-dark-border pl-4">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-mono">
              {auditCount} {lang === "en" ? "audits" : "जांच"}
            </span>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white border border-border dark:border-dark-border rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
            aria-label="Toggle language"
          >
            <Globe2 className="w-3.5 h-3.5" />
            {lang === "en" ? "हिंदी" : "English"}
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark((d) => !d)}
            className="text-ink-muted dark:text-slate-400 hover:text-ink dark:hover:text-white border border-border dark:border-dark-border rounded-lg p-1.5 transition-colors shrink-0"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        {/* Module content area */}
        <main className="flex-1 overflow-y-auto">
          {activeModule === "upi" && (
            <UPIInspector lang={lang} onAuditComplete={recordAudit} />
          )}
          {activeModule === "qr" && (
            <QRScanner lang={lang} onAuditComplete={recordAudit} />
          )}
          {activeModule !== "upi" && activeModule !== "qr" && (
            <ComingSoon module={currentModule} lang={lang} />
          )}
        </main>
      </div>

      {/* ── Audit Log Drawer ── */}
      {logOpen && (
        <AuditLogDrawer
          lang={lang}
          onClose={() => setLogOpen(false)}
          auditCount={auditCount}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Coming Soon placeholder
───────────────────────────────────────── */
function ComingSoon({
  module,
  lang,
}: {
  module: (typeof MODULES)[number];
  lang: "en" | "hi";
}) {
  const Icon = module.icon;
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-surface dark:bg-dark-border flex items-center justify-center border border-border dark:border-dark-border">
        <Icon className="w-8 h-8 text-ink-faint dark:text-slate-500" />
      </div>
      <div>
        <p className="font-semibold text-ink dark:text-white text-lg">
          {lang === "en" ? module.label : module.labelHi}
        </p>
        <p className="text-sm text-ink-muted dark:text-slate-400 mt-1">
          {lang === "en"
            ? "This module is under active development and will be available soon."
            : "यह मॉड्यूल निर्माणाधीन है और जल्द उपलब्ध होगा।"}
        </p>
      </div>
      <span className="sk-badge-warn">Stage {MODULES.findIndex((m) => m.id === module.id) + 1} — Coming Soon</span>
    </div>
  );
}

/* ─────────────────────────────────────────
   Audit Log Drawer
───────────────────────────────────────── */
function AuditLogDrawer({
  lang,
  onClose,
  auditCount,
}: {
  lang: "en" | "hi";
  onClose: () => void;
  auditCount: number;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/20 dark:bg-black/50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 sk-card rounded-none border-l z-50 flex flex-col dark:bg-dark-card dark:border-dark-border">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-ink-muted" />
            <span className="font-semibold text-sm text-ink dark:text-white">
              {lang === "en" ? "Saved Audit Log" : "सहेजे गए ऑडिट"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <Clock className="w-10 h-10 text-ink-faint dark:text-slate-600" />
          {auditCount === 0 ? (
            <p className="text-sm text-ink-muted dark:text-slate-400">
              {lang === "en"
                ? "No audits yet. Run a forensic scan to see results here."
                : "अभी कोई ऑडिट नहीं। जांच चलाएं।"}
            </p>
          ) : (
            <p className="text-sm text-ink-muted dark:text-slate-400">
              {lang === "en"
                ? `${auditCount} audit(s) completed this session. Full audit history with downloadable PDF receipts is coming in Stage 5.`
                : `इस सत्र में ${auditCount} ऑडिट पूरी हुई।`}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
