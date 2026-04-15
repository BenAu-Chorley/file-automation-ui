"use client";

import { useEffect, useState } from "react";

import type { MainNavigationItem } from "@/config/navigation/main-navigation";
import { cn } from "@/lib/utils";

type SectionNavigationProps = {
  items: MainNavigationItem[];
};

export function SectionNavigation({ items }: SectionNavigationProps) {
  const defaultHref = items[0]?.href ?? "";
  const [activeHref, setActiveHref] = useState(() => {
    if (typeof window === "undefined") {
      return defaultHref;
    }

    return window.location.hash || defaultHref;
  });

  useEffect(() => {
    function onHashChange() {
      setActiveHref(window.location.hash || defaultHref);
    }

    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [defaultHref]);

  return (
    <>
      <nav aria-label="Section navigation" className="lg:hidden">
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {items.map((item) => {
              const isActive = activeHref === item.href;

              return (
                <a
                  key={item.key}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-border bg-card/80 text-muted-foreground hover:bg-muted",
                  )}
                  href={item.href}
                  onClick={() => setActiveHref(item.href)}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div className="sticky top-24 space-y-3 rounded-[calc(var(--radius)+0.45rem)] border border-border bg-card/82 p-4 shadow-sm backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Section Navigation
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Move between the main workflow areas without leaving the page.
            </p>
          </div>
          <div className="space-y-2">
            {items.map((item) => {
              const isActive = activeHref === item.href;

              return (
                <a
                  key={item.key}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "block rounded-xl border px-3 py-3 transition-colors",
                    isActive
                      ? "border-primary/20 bg-primary/10 text-foreground"
                      : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-muted/80 hover:text-foreground",
                  )}
                  href={item.href}
                  onClick={() => setActiveHref(item.href)}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5">{item.description}</p>
                </a>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}