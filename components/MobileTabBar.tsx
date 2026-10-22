"use client";

import clsx from "clsx";
import type { WorkbenchNavModule } from "@/components/AppSidebar";

export default function MobileTabBar({
  modules,
  lang,
  activeModule,
  onSelectModule,
}: {
  modules: WorkbenchNavModule[];
  lang: "en" | "hi";
  activeModule: string;
  onSelectModule: (id: string) => void;
}) {
  return (
    <nav
      className="md:hidden fixed left-3 right-[5.75rem] bottom-3 z-30 sk-sidebar flex items-stretch justify-around gap-0.5 px-1.5 py-1.5"
      aria-label={lang === "en" ? "Modules" : "मॉड्यूल"}
    >
      {modules.map((mod) => {
        const Icon = mod.icon;
        const isActive = activeModule === mod.id;
        const isLive = mod.status === "live";

        return (
          <button
            key={mod.id}
            onClick={() => isLive && onSelectModule(mod.id)}
            disabled={!isLive}
            className={clsx(
              "relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-2 min-w-0 transition-colors duration-150",
              isActive ? "text-accent bg-ink/[0.06]" : "text-ink-muted",
              !isLive && "opacity-40 cursor-not-allowed"
            )}
            aria-current={isActive ? "page" : undefined}
            aria-label={lang === "en" ? mod.label : mod.labelHi}
          >
            {isActive && (
              <span
                className="absolute left-1/2 -translate-x-1/2 top-1 h-0.5 w-4 rounded-full bg-gradient-to-r from-accent to-accent-end shadow-[0_0_8px_rgb(var(--rgb-accent)/0.7)]"
                aria-hidden="true"
              />
            )}
            <Icon className="w-5 h-5 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
            {isLive && !isActive && (
              <span className="sk-pulse-dot absolute top-1.5 right-[18%]" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
