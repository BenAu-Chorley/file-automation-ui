import type { ReactNode } from "react";

import { SectionNavigation } from "@/components/layout/section-navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { mainNavigation } from "@/config/navigation/main-navigation";
import { cn } from "@/lib/utils";
import packageManifest from "~/package.json";

type AppShellProps = {
  children: ReactNode;
  className?: string;
};

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_oklch,var(--teams-brand-alt)_18%,transparent),transparent_30%),linear-gradient(180deg,color-mix(in_oklch,var(--teams-surface)_72%,var(--background))_0%,var(--background)_100%)] text-foreground",
        className,
      )}
    >
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[110rem] items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-10">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Internal Workspace
            </p>
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              File Automation Configuration
            </p>
            <div className="mt-0.5 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">
              {packageManifest.version}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[110rem] flex-col gap-4 px-4 py-6 sm:px-8 lg:flex-row lg:items-start lg:gap-6 lg:px-10 lg:py-8">
        <SectionNavigation items={mainNavigation} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}