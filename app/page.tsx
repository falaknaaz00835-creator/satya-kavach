"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  X,
  Activity,
  BookOpen,
  Camera,
  Share2,
  Search,
} from "lucide-react";
import UPIInspector from "@/components/modules/UPIInspector";
import StepWizard from '@/components/StepWizard';
import QRScanner from "@/components/modules/QRScanner";
import ThreatTicker from '@/components/ThreatTicker';
import LinkScanner from '@/components/LinkScanner';
import JobScreener from "@/components/modules/JobScreener";
import DeepfakeInspector from "@/components/modules/DeepfakeInspector";
import DocumentInspector from "@/components/modules/DocumentInspector";
import KavachCopilot from "@/components/KavachCopilot";
import ARScannerView from "@/components/ARScannerView";
import ShareShieldModal, { ShareShieldData } from "@/components/ShareShieldModal";
import CommandPalette from "@/components/CommandPalette";
import AppSidebar from "@/components/AppSidebar";
import MobileTabBar from "@/components/MobileTabBar";
import ImageForensics from '@/components/ImageForensics';
import UTRScanner from '@/components/UTRScanner';
import Button from "@/components/Button";

/* ─────────────────────────────────────────
   Navigation module definitions
───────────────────────────────────────── */
const MODULES = [
  {
  id: "forensics",
  label: "Pixel Forensics",
  labelHi: "पिक्सेल फ़ोरेंसिक्स",
  icon: Camera, // You can use Camera or FileSearch from lucide-react
  },
  {
  id: "workflow",
  label: "Forensic Workflow",
  labelHi: "फ़ोरेंसिक वर्कफ़्लो",
  icon: ShieldCheck, // Or any Lucide icon you prefer
  },

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
    status: "live" as const,
    description: "Fake offer letter screener",
  },
  {
  id: 'utr-scanner',
  label: 'UTR Validator',
  icon: '🔢', // Or whatever icon system you are using (Lucide/Heroicons)
  component: <UTRScanner />
  },
  {
    id: "deepfake",
    label: "Deepfake Inspector",
    labelHi: "डीपफेक जांच",
    icon: Video,
    status: "live" as const,
    description: "Video & face-swap forensics",
  },
  {
  id: "links",
  label: "Link Inspector",
  labelHi: "लिंक इंस्पेक्टर",
  icon: FileSearch, // Or any icon from lucide-react
 },
  {
    id: "document",
    label: "Document Forensics",
    labelHi: "दस्तावेज़ जांच",
    icon: FileSearch,
    status: "live" as const,
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
  const [arOpen, setArOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareShieldData | null>(null);
  const [activeQRTarget, setActiveQRTarget] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { count: auditCount, increment: recordAudit } = useAuditCounter();

  /* Toggle dark class on <html> */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* Global Cmd+K / Ctrl+K keyboard shortcut */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* Global listener for Family Shield trigger from any module */
  useEffect(() => {
    const handleFamilyShield = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setShareData(custom.detail);
        setShareOpen(true);
      }
    };
    window.addEventListener("open-family-shield", handleFamilyShield);
    return () => window.removeEventListener("open-family-shield", handleFamilyShield);
  }, []);

  const currentModule = MODULES.find((m) => m.id === activeModule)!;

  return (
<div className="min-h-screen md:h-screen overflow-hidden bg-bg sk-ambient-glow flex flex-col md:flex-row p-0">      {/* ── Sidebar (desktop) ── */}
      <AppSidebar
        modules={MODULES}
        lang={lang}
        activeModule={activeModule}
        onSelectModule={setActiveModule}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        auditCount={auditCount}
        onOpenLog={() => setLogOpen(true)}
      />

      {/* ── Main area ── */}
      <div className="flex flex-col flex-1 min-w-0 md:rounded-2xl md:overflow-hidden md:border md:border-border md:bg-surface/40">
        {/* Top status bar */}
        <header className="h-14 shrink-0 border-b border-border bg-surface/70 backdrop-blur-md flex items-center gap-3 px-4 md:px-6 overflow-x-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <span className="text-ink-muted dark:text-slate-400 shrink-0">Workbench</span>
            <ChevronRight className="w-3.5 h-3.5 text-ink-faint dark:text-slate-600 shrink-0" />
            <span className="font-semibold text-ink dark:text-white truncate">
              {lang === "en" ? currentModule.label : currentModule.labelHi}
            </span>
          </div>

          {/* Apple Spotlight Search Trigger (⌘K) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            className="ml-auto shrink-0"
            title="Open Command Palette (Ctrl+K or ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline font-medium">
              {lang === "en" ? "Search or Jump..." : "खोजें या चुनें..."}
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-card dark:bg-white/10 border border-border dark:border-white/10 rounded-md">
              ⌘K
            </kbd>
          </Button>

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-trust opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-trust" />
            </span>
            <span className="text-xs text-trust font-medium">
              {lang === "en" ? "Live Forensics" : "लाइव जांच"}
            </span>
          </div>

          {/* Audit counter */}
          <div className="flex items-center gap-1.5 shrink-0 text-xs text-ink-muted dark:text-slate-400 border-l border-border dark:border-dark-border pl-3">
            <Activity className="w-3.5 h-3.5" />
            <span className="font-mono">
              {auditCount} {lang === "en" ? "audits" : "जांच"}
            </span>
          </div>

          {/* AR Camera Scan Trigger */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setArOpen(true)}
            className="shrink-0 text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
            title="Launch Live AR Camera Viewfinder Mode"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">AR Camera</span>
            <span className="sm:hidden">AR</span>
          </Button>

          {/* Family Shield Share Trigger */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!shareData) {
                setShareData({
                  module: currentModule.label,
                  verdict: "fraud",
                  riskScore: 92,
                  target: "upi://pay?pa=scam-phish@icici&am=25000&mode=02",
                  evidence: [
                    "Critical: mode=02 collect request masquerading as payment receipt",
                    "Unverified payment handle flagged in cyber-cell registry",
                    "Tampered transaction reference detected",
                  ],
                  sha256: "8e41a3bc89d9f58a7428c9472e3a152d1bc94539829f2710bbde54d249f0ad61",
                  timestamp: new Date().toISOString(),
                });
              }
              setShareOpen(true);
            }}
            className="shrink-0"
            title="Open Multi-Platform Family Shield & Viral Share Drawer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Family Shield</span>
            <span className="sm:hidden">Shield</span>
          </Button>

          {/* Language toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
            className="shrink-0"
            aria-label="Toggle language"
          >
            <Globe2 className="w-3.5 h-3.5" />
            {lang === "en" ? "हिंदी" : "English"}
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDark((d) => !d)}
            className="shrink-0 px-2.5"
            aria-label="Toggle dark mode"
          >
            {dark ? <Sun className="w-4 h-4 text-accent" /> : <Moon className="w-4 h-4" />}
          </Button>
        </header>

        {/* Module content area */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="h-full min-h-full"
            >
              {activeModule === "upi" && (
                <UPIInspector
                  lang={lang}
                  onAuditComplete={recordAudit}
                  onOpenShareShield={(data) => {
                    setShareData(data);
                    setShareOpen(true);
                  }}
                />
              )}
              {activeModule === 'forensics' && <ImageForensics />}
              {activeModule === 'workflow' && <StepWizard />}
              {activeModule === "qr" && (
                <QRScanner
                  lang={lang}
                  onAuditComplete={recordAudit}
                  initialInput={activeQRTarget}
                  onOpenShareShield={(data) => {
                    setShareData(data);
                    setShareOpen(true);
                  }}
                />
              )}
              {activeModule === "job" && (
                <JobScreener lang={lang} onAuditComplete={recordAudit} />
              )}
              {activeModule === "deepfake" && (
                <DeepfakeInspector lang={lang} onAuditComplete={recordAudit} />
              )}
              {activeModule === "document" && (
                <DocumentInspector lang={lang} onAuditComplete={recordAudit} />
              )}
              {activeModule === 'links' && <LinkScanner />}
              {activeModule !== "upi" && activeModule !== "qr" && activeModule !== "job" && activeModule !== "deepfake" && activeModule !== "document" && (
                <ComingSoon module={currentModule} lang={lang} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <MobileTabBar
        modules={MODULES}
        lang={lang}
        activeModule={activeModule}
        onSelectModule={setActiveModule}
      />

      {/* ── AR Camera Viewfinder Overlay ── */}
      {arOpen && (
        <ARScannerView
          lang={lang}
          onClose={() => setArOpen(false)}
          onDetectPayload={(payload) => {
            if (payload.type === "qr" && payload.text) {
              setActiveQRTarget(payload.text);
              setActiveModule("qr");
              setArOpen(false);
            }
          }}
        />
      )}

      {/* ── Multi-Platform Family Shield & Viral Share Drawer ── */}
      {shareOpen && shareData && (
        <ShareShieldModal
          data={shareData}
          onClose={() => setShareOpen(false)}
          lang={lang}
        />
      )}

      {/* ── Apple Spotlight Command Palette Modal ── */}
      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        lang={lang}
        onSelectModule={setActiveModule}
        onOpenAR={() => setArOpen(true)}
        onOpenShareShield={() => {
          if (!shareData) {
            setShareData({
              module: currentModule.label,
              verdict: "fraud",
              riskScore: 92,
              target: "upi://pay?pa=scam-phish@icici&am=25000&mode=02",
              evidence: [
                "Critical: mode=02 collect request masquerading as payment receipt",
                "Unverified payment handle flagged in cyber-cell registry",
                "Tampered transaction reference detected",
              ],
              sha256: "8e41a3bc89d9f58a7428c9472e3a152d1bc94539829f2710bbde54d249f0ad61",
              timestamp: new Date().toISOString(),
            });
          }
          setShareOpen(true);
        }}
        onToggleDark={() => setDark((d) => !d)}
        onToggleLang={() => setLang((l) => (l === "en" ? "hi" : "en"))}
        isDark={dark}
        auditCount={auditCount}
      />

      {/* ── Kavach AI Security Copilot Floating Agent ── */}
      <KavachCopilot
        lang={lang}
        activeTab={activeModule}
        onSelectTab={setActiveModule}
      />

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
          <Button
            variant="secondary"
            size="xs"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white"
            aria-label="Close Audit Log"
          >
            <X className="w-4 h-4" />
          </Button>
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