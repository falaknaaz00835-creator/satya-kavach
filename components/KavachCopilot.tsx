"use client";

import { useState, useRef, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Send,
  X,
  Terminal,
  RotateCcw,
  ExternalLink,
  MessageSquare,
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

  const QUICK_SCENARIOS = [
    {
      id: "upi-nosms",
      module: "upi",
      en: "Customer says UPI paid, no SMS received — what to do?",
      hi: "कस्टमर बोल रहा है UPI से पैसे भेज दिए, लेकिन SMS नहीं आया?",
    },
    {
      id: "qr-cashback",
      module: "qr",
      en: "Someone sent a QR code to 'receive' cashback — is it safe?",
      hi: "किसी ने कैशबैक 'प्राप्त' करने के लिए QR भेजा है — क्या यह सुरक्षित है?",
    },
    {
      id: "job-laptop-fee",
      module: "job",
      en: "Company asking ₹1,500 refundable laptop fee for a job?",
      hi: "कंपनी नौकरी के लिए ₹1,500 रिफंडेबल लैपटॉप फीस मांग रही है?",
    },
    {
      id: "police-digital-arrest",
      module: "deepfake",
      en: "Police video call on WhatsApp threatening 'digital arrest'?",
      hi: "व्हाट्सएप पर पुलिस वीडियो कॉल 'डिजिटल अरेस्ट' की धमकी दे रही है?",
    },
  ];

  useEffect(() => {
    if (isOpen) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

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

      if (!res.ok) throw new Error("Failed to consult the copilot.");

      const data: CopilotResponse = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "copilot",
          response: data,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-err-" + Date.now(),
          sender: "copilot",
          response: {
            riskLevel: "HIGH RISK",
            riskScore: 90,
            summary:
              lang === "hi"
                ? "सावधानी: वित्तीय अनुरोधों में कभी भी तुरंत पैसे न भेजें।"
                : "Security rule: do not transfer money, share OTPs, or scan unknown QR codes.",
            actionSteps: [
              lang === "hi"
                ? "कॉलर या प्राप्तकर्ता को स्वतंत्र रूप से सत्यापित करें।"
                : "Verify the caller or recipient independently.",
              lang === "hi"
                ? "सत्य कवच मॉड्यूल से फ़ाइल या लिंक की जाँच करें।"
                : "Inspect the file or link using a SatyaKavach instrument.",
              lang === "hi"
                ? "राष्ट्रीय साइबर सहायता के लिए 1930 पर कॉल करें।"
                : "Call 1930 for national cybercrime support.",
            ],
            recommendedModule: "upi",
            moduleActionLabel:
              lang === "hi" ? "UPI इंस्पेक्टर खोलें" : "Open the UPI inspector",
            telemetry: {
              provider: "SatyaKavach local runtime",
              model: "Nemotron-Nano (local)",
              latencyMs: 140,
              mode: "offline-fallback",
            },
          },
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleSwitch = (
    mod: "upi" | "qr" | "job" | "deepfake" | "document"
  ) => onSelectTab(mod);

  return (
    <>
      {/* ── Launcher ── */}
      {!isOpen && (
        <div className="no-print fixed bottom-[4.75rem] right-3 z-40 lg:bottom-6 lg:right-6">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex h-10 w-10 items-center justify-center gap-2.5 rounded-full border border-ink/20 bg-ink text-paper shadow-lift transition-all duration-200 hover:-translate-y-0.5 sm:h-auto sm:w-auto sm:rounded-lg sm:px-3.5 sm:py-2.5 dark:border-white/20 dark:bg-paper dark:text-ink"
            aria-label="Open Kavach copilot"
          >
            <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-trust ring-2 ring-paper sm:static sm:mr-0 sm:h-1.5 sm:w-1.5 sm:ring-0 dark:ring-dark-surface" />
            <MessageSquare className="h-4 w-4 opacity-80 sm:h-3.5 sm:w-3.5" strokeWidth={1.8} />
            <span className="hidden font-mono text-[10px] uppercase tracking-eyebrow sm:inline">
              {lang === "en" ? "Ask Kavach" : "कवच से पूछें"}
            </span>
            <span className="hidden h-3 w-px bg-paper/25 sm:block dark:bg-ink/20" />
            <span className="hidden font-mono text-[9px] uppercase tracking-wider opacity-50 sm:block">
              copilot
            </span>
          </button>
        </div>
      )}

      {/* ── Drawer ── */}
      {isOpen && (
        <aside
          role="dialog"
          aria-label="Kavach copilot"
          className="no-print fixed inset-x-0 bottom-0 z-50 flex h-[86dvh] flex-col overflow-hidden rounded-t-xl border border-rule bg-paper shadow-lift pop dark:border-dark-border dark:bg-dark-surface sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[min(680px,88dvh)] sm:w-[440px] sm:rounded-xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3 dark:border-dark-border">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-rule bg-card dark:border-white/15 dark:bg-white/5">
                <ShieldCheck className="h-4 w-4 text-trust" strokeWidth={1.8} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-[15px] leading-none text-ink dark:text-white">
                    {lang === "en" ? "Kavach copilot" : "कवच कोपायलट"}
                  </h3>
                  <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-trust">
                    <span className="h-1 w-1 rounded-full bg-trust" />
                    {lang === "en" ? "online" : "ऑनलाइन"}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/30">
                  Nemotron-70B · Nebius token factory
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([])}
                className="grid h-7 w-7 place-items-center rounded-md text-ink-muted transition hover:bg-paper-sunk hover:text-ink dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                title={lang === "en" ? "Clear conversation" : "बातचीत साफ़ करें"}
                aria-label="Clear chat"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-md text-ink-muted transition hover:bg-paper-sunk hover:text-ink dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close copilot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-rule bg-card p-3.5 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="font-display text-[15px] leading-snug text-ink dark:text-white">
                    {lang === "en"
                      ? "Someone is pressuring you right now. Tell me what is happening."
                      : "कोई आप पर दबाव बना रहा है? बताइए क्या हो रहा है।"}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted dark:text-white/45">
                    {lang === "en"
                      ? "English, Hindi or Hinglish. I classify the risk, give you three steps, and open the right instrument."
                      : "अंग्रेज़ी, हिंदी या हिंग्लिश। मैं जोखिम बताऊँगा, तीन कदम दूँगा और सही यंत्र खोलूँगा।"}
                  </p>
                </div>

                <div>
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/25">
                    {lang === "en" ? "Common situations" : "आम स्थितियाँ"}
                  </p>
                  <div className="space-y-1.5">
                    {QUICK_SCENARIOS.map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => handleAsk(lang === "hi" ? sc.hi : sc.en)}
                        disabled={isLoading}
                        className="group flex w-full items-center justify-between gap-2 rounded-md border border-rule bg-card px-3 py-2.5 text-left text-[12px] font-medium text-ink transition-colors hover:border-ink-faint dark:border-white/10 dark:bg-white/[0.02] dark:text-white/80 dark:hover:border-white/25"
                      >
                        <span className="line-clamp-1 pr-2">
                          {lang === "hi" ? sc.hi : sc.en}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 dark:text-white/30" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                {msg.sender === "user" && (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-lg rounded-tr-sm bg-ink px-3.5 py-2.5 text-[12px] font-medium leading-relaxed text-paper dark:bg-white dark:text-ink">
                      {msg.text}
                    </div>
                  </div>
                )}

                {msg.sender === "copilot" && msg.response && (
                  <div className="space-y-2.5">
                    <div className="space-y-3 rounded-lg border border-rule bg-card p-3.5 dark:border-white/10 dark:bg-dark-card">
                      <div className="flex items-center justify-between">
                        {msg.response.riskLevel === "HIGH RISK" ? (
                          <span className="sk-badge-fraud">
                            <ShieldAlert className="h-3 w-3" />
                            {lang === "en" ? "High risk" : "उच्च जोखिम"} ·{" "}
                            {msg.response.riskScore}%
                          </span>
                        ) : msg.response.riskLevel === "CAUTION" ? (
                          <span className="sk-badge-warn">
                            <AlertTriangle className="h-3 w-3" />
                            {lang === "en" ? "Caution" : "सावधान"} ·{" "}
                            {msg.response.riskScore}%
                          </span>
                        ) : (
                          <span className="sk-badge-trust">
                            <ShieldCheck className="h-3 w-3" />
                            {lang === "en" ? "Safe protocol" : "सुरक्षित"}
                          </span>
                        )}
                        <span className="font-mono text-[9px] text-ink-faint dark:text-white/30">
                          {msg.timestamp}
                        </span>
                      </div>

                      <p className="text-[12px] font-medium leading-relaxed text-ink dark:text-white/90">
                        {msg.response.summary}
                      </p>

                      <div className="border-t border-dashed border-rule pt-2.5 dark:border-white/10">
                        <p className="mb-2 font-mono text-[9px] uppercase tracking-eyebrow text-ink-faint dark:text-white/30">
                          {lang === "en" ? "Do this now" : "अभी यह करें"}
                        </p>
                        <ul className="space-y-2">
                          {msg.response.actionSteps.map((step, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-[11.5px] leading-snug text-ink-muted dark:text-white/60"
                            >
                              <span className="mt-px w-4 shrink-0 font-mono text-[9px] text-accent">
                                {String(idx + 1).padStart(2, "0")}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        onClick={() =>
                          handleModuleSwitch(msg.response!.recommendedModule)
                        }
                        className="sk-btn-accent w-full py-2 text-xs"
                      >
                        <span>{msg.response.moduleActionLabel}</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>

                      <div className="flex items-center justify-between border-t border-rule pt-2 font-mono text-[9px] uppercase tracking-wider text-ink-faint dark:border-white/10 dark:text-white/25">
                        <span className="flex max-w-[260px] items-center gap-1 truncate">
                          <Terminal className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">
                            {msg.response.telemetry.provider}
                          </span>
                        </span>
                        <span className="shrink-0">
                          ~{msg.response.telemetry.latencyMs}ms
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3 rounded-lg border border-rule bg-card p-3.5 dark:border-white/10 dark:bg-dark-card">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-trust opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-trust" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted dark:text-white/40">
                  {lang === "en"
                    ? "Reading intent · Nemotron-70B"
                    : "विश्लेषण जारी · Nemotron-70B"}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          {messages.length > 0 && !isLoading && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto border-t border-rule px-3 py-2 dark:border-dark-border">
              {QUICK_SCENARIOS.slice(0, 3).map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleAsk(lang === "hi" ? sc.hi : sc.en)}
                  className="whitespace-nowrap rounded border border-rule px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-ink-muted transition hover:border-ink-faint dark:border-white/10 dark:text-white/40"
                >
                  {sc.module}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 border-t border-rule bg-card p-3 dark:border-dark-border dark:bg-dark-card">
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
                    ? "Describe what happened…"
                    : "क्या हुआ, बताइए…"
                }
                disabled={isLoading}
                className="sk-field flex-1 py-2 text-xs"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isLoading}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink text-paper transition hover:bg-ink-soft disabled:opacity-30 dark:bg-white dark:text-ink"
                aria-label="Send query"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
