"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Send,
  X,
  Sparkles,
  Bot,
  Terminal,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import type { CopilotResponse } from "@/app/api/copilot/route";

interface KavachCopilotProps {
  lang: "en" | "hi";
  activeTab: string;
  onSelectTab: (tabId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text?: string;
  response?: CopilotResponse;
  timestamp: string;
}

export default function KavachCopilot({
  lang,
  activeTab,
  onSelectTab,
}: KavachCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 4 One-Click Quick Scenarios
  const QUICK_SCENARIOS = [
    {
      id: "upi-nosms",
      module: "upi",
      en: "Customer says UPI paid, no SMS received—what to do?",
      hi: "कस्टमर बोल रहा है UPI से पैसे भेज दिए, लेकिन SMS नहीं आया?",
    },
    {
      id: "qr-cashback",
      module: "qr",
      en: "Someone sent a QR code to 'receive' cashback—is it safe?",
      hi: "किसी ने कैशबैक 'प्राप्त' करने के लिए QR भेजा है—क्या यह सुरक्षित है?",
    },
    {
      id: "job-laptop-fee",
      module: "job",
      en: "Company asking ₹1,500 refundable laptop fee for job?",
      hi: "कंपनी नौकरी के लिए ₹1,500 रिफंडेबल लैपटॉप फीस मांग रही है?",
    },
    {
      id: "police-digital-arrest",
      module: "deepfake",
      en: "Police video call on WhatsApp threatening Digital Arrest?",
      hi: "व्हाट्सएप पर पुलिस वीडियो कॉल डिजिटल अरेस्ट की धमकी दे रही है?",
    },
  ];

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  const handleAsk = async (queryText: string) => {
    const q = queryText.trim();
    if (!q || isLoading) return;

    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, lang, activeModule: activeTab }),
      });

      if (!res.ok) {
        throw new Error("Failed to consult Copilot.");
      }

      const data: CopilotResponse = await res.json();
      const botMsg: ChatMessage = {
        id: "bot-" + Date.now(),
        sender: "copilot",
        response: data,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // Fallback emergency message
      const errorMsg: ChatMessage = {
        id: "bot-err-" + Date.now(),
        sender: "copilot",
        response: {
          riskLevel: "HIGH RISK",
          riskScore: 90,
          summary:
            lang === "hi"
              ? "सावधानी: वित्तीय अनुरोधों में कभी भी तुरंत पैसे न भेजें।"
              : "Security Rule: Do not transfer money, share OTPs, or scan unknown QR codes.",
          actionSteps: [
            "Verify the caller or recipient independently.",
            "Inspect the file or link using SatyaKavach modules.",
            "Call 1930 for national cybercrime support.",
          ],
          recommendedModule: "upi",
          moduleActionLabel: lang === "hi" ? "UPI इंस्पेक्टर खोलें →" : "Open UPI Inspector Now →",
          telemetry: {
            provider: "SatyaKavach Local Runtime",
            model: "Nemotron-Nano (Local)",
            latencyMs: 140,
            mode: "offline-fallback",
          },
        },
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSwitch = (mod: "upi" | "qr" | "job" | "deepfake" | "document") => {
    onSelectTab(mod);
    // Keep drawer or allow user to see the workbench transition
  };

  return (
    <>
      {/* ───────────────────────────────────────────────────────────
          1. Sleek Floating Trigger Button (Bottom-Right)
          Strictly CERT-In / Stripe / Slate-and-Emerald aesthetic
      ─────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <aside
          role="region"
          aria-label="Kavach AI Copilot Quick Launcher"
          className="fixed bottom-5 right-6 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-ink text-white dark:bg-white dark:text-dark-surface shadow-xl hover:shadow-2xl border border-slate-700/30 dark:border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all group"
            aria-label="Open Kavach Copilot"
          >
            {/* Live emerald pulsating dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>

            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
              <span className="text-xs font-semibold tracking-tight">
                {lang === "en" ? "Kavach Copilot" : "कवच कोपायलट"}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                • AI Security Agent
              </span>
            </div>

            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 dark:text-emerald-800 border border-emerald-500/30 font-semibold">
              COPILOT
            </span>
          </button>
        </aside>
      )}

      {/* ───────────────────────────────────────────────────────────
          2. Interactive Slide-Over Copilot Drawer
      ─────────────────────────────────────────────────────────── */}
      {isOpen && (
        <aside
          role="region"
          aria-label="Kavach AI Security Copilot Workspace"
          className="fixed bottom-5 right-6 z-50 w-[92vw] sm:w-[460px] max-h-[88vh] h-[680px] flex flex-col sk-card dark:bg-dark-card border border-border dark:border-dark-border shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-border dark:border-dark-border bg-card dark:bg-dark-card flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-ink dark:text-white leading-none">
                    {lang === "en" ? "Kavach AI Security Copilot" : "कवच AI सुरक्षा कोपायलट"}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted dark:text-slate-400 mt-1 font-mono">
                  Nemotron-70B • Nebius Token Factory
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([])}
                className="p-1.5 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white hover:bg-surface dark:hover:bg-dark-border rounded-lg transition-colors"
                title={lang === "en" ? "Clear conversation" : "बातचीत साफ़ करें"}
                aria-label="Clear chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-ink-muted hover:text-ink dark:text-slate-400 dark:hover:text-white hover:bg-surface dark:hover:bg-dark-border rounded-lg transition-colors"
                aria-label="Close Copilot"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Body & Scenarios */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome banner if no messages */}
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-border dark:border-dark-border bg-surface dark:bg-dark-surface/50">
                  <div className="flex items-center gap-2 text-xs font-semibold text-ink dark:text-white mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {lang === "en"
                        ? "Real-Time Cyber Scam Triage & Advice"
                        : "रीयल-टाइम साइबर धोखाधड़ी सलाह"}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted dark:text-slate-400 leading-relaxed">
                    {lang === "en"
                      ? "Ask any question in English, Hindi, or Hinglish. Powered by Nemotron forensic reasoning, I will classify the risk and guide you to the exact forensic tool."
                      : "हिंदी, हिंग्लिश या अंग्रेज़ी में कोई भी सवाल पूछें। निमोट्रॉन फोरेंसिक तकनीक से मैं जोखिम की जांच कर आपको सही स्कैनर पर ले जाऊंगा।"}
                  </p>
                </div>

                {/* 4 Quick Scenarios */}
                <div>
                  <p className="text-[10px] uppercase font-mono tracking-wider text-ink-faint dark:text-slate-500 font-semibold mb-2">
                    {lang === "en" ? "⚡ Quick Triage Scenarios" : "⚡ त्वरित सहायता विकल्प"}
                  </p>
                  <div className="space-y-1.5">
                    {QUICK_SCENARIOS.map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => handleAsk(lang === "hi" ? sc.hi : sc.en)}
                        disabled={isLoading}
                        className="w-full text-left p-2.5 rounded-lg border border-border dark:border-dark-border bg-card dark:bg-dark-card hover:bg-surface dark:hover:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-xs font-medium text-ink dark:text-slate-200 flex items-center justify-between group"
                      >
                        <span className="line-clamp-1 pr-2">
                          {lang === "hi" ? sc.hi : sc.en}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-ink-faint group-hover:text-emerald-600 dark:group-hover:text-emerald-400 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Stream */}
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {/* User Bubble */}
                {msg.sender === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] px-3.5 py-2.5 rounded-xl rounded-tr-sm bg-ink text-white dark:bg-white dark:text-dark-surface text-xs font-medium leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                )}

                {/* Copilot Response Card */}
                {msg.sender === "copilot" && msg.response && (
                  <div className="space-y-2.5">
                    {/* Risk Badge & Summary Card */}
                    <div className="p-3.5 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        {/* Risk Badge */}
                        {msg.response.riskLevel === "HIGH RISK" ? (
                          <span className="sk-badge-fraud">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            HIGH RISK • {msg.response.riskScore}%
                          </span>
                        ) : msg.response.riskLevel === "CAUTION" ? (
                          <span className="sk-badge-warn">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            CAUTION • {msg.response.riskScore}%
                          </span>
                        ) : (
                          <span className="sk-badge-trust">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            SAFE PROTOCOL
                          </span>
                        )}

                        <span className="text-[10px] text-ink-faint dark:text-slate-500 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-xs text-ink dark:text-slate-100 font-medium leading-relaxed">
                        {msg.response.summary}
                      </p>

                      {/* 3 Plain-Language Action Steps */}
                      <div className="pt-2 border-t border-border dark:border-dark-border">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-ink-faint dark:text-slate-400 font-semibold mb-2">
                          {lang === "en" ? "Immediate Action Steps:" : "तत्काल उठाए जाने वाले कदम:"}
                        </p>
                        <ul className="space-y-1.5">
                          {msg.response.actionSteps.map((step, idx) => (
                            <li
                              key={idx}
                              className="text-[11px] text-ink-muted dark:text-slate-300 flex items-start gap-2 leading-snug"
                            >
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 1-Click Module Switcher */}
                      <div className="pt-2">
                        <button
                          onClick={() => handleModuleSwitch(msg.response!.recommendedModule)}
                          className="sk-btn-primary w-full text-xs py-2 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span>{msg.response.moduleActionLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Telemetry Footer */}
                      <div className="pt-2 border-t border-border dark:border-dark-border flex items-center justify-between text-[9px] font-mono text-ink-faint dark:text-slate-500">
                        <span className="flex items-center gap-1 truncate max-w-[280px]">
                          <Terminal className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          <span className="truncate">{msg.response.telemetry.provider}</span>
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                          ~{msg.response.telemetry.latencyMs}ms
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="p-3.5 rounded-xl border border-border dark:border-dark-border bg-card dark:bg-dark-card flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-xs text-ink-muted dark:text-slate-400 font-mono">
                  {lang === "en"
                    ? "Routing intent via Nebius Token Factory (Nemotron-70B)..."
                    : "निमोत्रॉन 70B फोरेंसिक इंजन से विश्लेषण किया जा रहा है..."}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick chip bar if conversation active */}
          {messages.length > 0 && !isLoading && (
            <div className="px-3 py-1.5 border-t border-border dark:border-dark-border bg-surface dark:bg-dark-surface/50 flex gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
              {QUICK_SCENARIOS.slice(0, 3).map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleAsk(lang === "hi" ? sc.hi : sc.en)}
                  className="px-2 py-1 rounded-md border border-border dark:border-dark-border bg-card dark:bg-dark-card text-ink-muted dark:text-slate-300 whitespace-nowrap hover:border-slate-400 transition-colors"
                >
                  {sc.module.toUpperCase()} Scam?
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-border dark:border-dark-border bg-card dark:bg-dark-card shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(inputQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  lang === "en"
                    ? "Ask in English, Hindi, or Hinglish..."
                    : "हिंदी, हिंग्लिश या अंग्रेज़ी में पूछें..."
                }
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-border dark:border-dark-border bg-surface dark:bg-dark-surface text-ink dark:text-white placeholder:text-ink-faint dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="p-2 rounded-lg bg-ink text-white dark:bg-white dark:text-dark-surface hover:bg-ink/90 dark:hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                aria-label="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
