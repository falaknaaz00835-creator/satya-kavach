"use client";

import clsx from "clsx";
import {
  ChevronRight,
  Clock,
  Menu,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type WorkbenchNavModule = {
  id: string;
  label: string;
  labelHi: string;
  icon: LucideIcon;
  status: "live" | "soon";
  description: string;
};

export default function AppSidebar({
  modules,
  lang,
  activeModule,
  onSelectModule,
  sidebarOpen,
  onToggleSidebar,
  auditCount,
  onOpenLog,
}: {
  modules: WorkbenchNavModule[];
  lang: "en" | "hi";
  activeModule: string;
  onSelectModule: (id: string) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  auditCount: number;
  onOpenLog: () => void;
}) {
  return (
    <aside
      className={clsx(
        "sk-sidebar hidden md:flex flex-col h-full shrink-0 transition-[width] duration-200 ease-out",
        sidebarOpen ? "w-64" : "w-[4.5rem]"
      )}
    >
      <div className="flex items-center gap-3 px-3 py-4 h-[4.25rem] shrink-0">
        <div className="relative shrink-0">
          <div
            className="absolute inset-0 rounded-xl bg-gradient-to-br from-accent to-accent-end blur-md opacity-60"
            aria-hidden="true"
          />
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-end flex items-center justify-center shadow-[0_0_18px_rgb(var(--rgb-accent)/0.45)]">
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.4} />
          </div>
        </div>
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            <p className="font-heading text-sm font-semibold text-ink leading-none truncate tracking-tight">
              SatyaKavach
            </p>
            <p className="text-[11px] text-ink-muted leading-none mt-1 truncate">
              सत्य कवच
            </p>
          </div>
        )}
        <button
          onClick={onToggleSidebar}
          className="ml-auto text-ink-muted hover:text-ink transition-colors shrink-0 p-1 rounded-lg hover:bg-ink/[0.05]"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {sidebarOpen && (
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            {lang === "en" ? "Forensic Modules" : "फॉरेंसिक मॉड्यूल"}
          </p>
        )}
        {modules.map((mod) => {
          const Icon = mod.icon;
          const isActive = activeModule === mod.id;
          const isLive = mod.status === "live";

          return (
            <button
              key={mod.id}
              onClick={() => isLive && onSelectModule(mod.id)}
              className={clsx(
                "sk-nav-item w-full text-left",
                isActive && "active",
                !isLive && "opacity-40 cursor-not-allowed"
              )}
              disabled={!isLive}
              aria-current={isActive ? "page" : undefined}
              title={!sidebarOpen ? (lang === "en" ? mod.label : mod.labelHi) : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {sidebarOpen && (
                <span className="flex-1 min-w-0">
                  <span className="block truncate">
                    {lang === "en" ? mod.label : mod.labelHi}
                  </span>
                  {!isActive && !isLive && (
                    <span className="text-[10px] text-ink-faint font-normal">
                      Coming soon
                    </span>
                  )}
                </span>
              )}
              {isLive && !isActive && (
                <span
                  className="sk-pulse-dot ml-auto shrink-0"
                  title="Live"
                  aria-label="Live"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-2 py-2 shrink-0">
        <button
          onClick={onOpenLog}
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
            <span className="text-[10px] font-bold font-mono bg-ink/10 text-ink px-1.5 py-0.5 rounded-full shrink-0">
              {auditCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
