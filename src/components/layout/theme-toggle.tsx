"use client";

import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const themeOptions = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
] as const;

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const activeTheme = theme ?? "system";

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card/85 p-1 shadow-sm backdrop-blur">
      <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Theme
      </span>
      <div className="flex items-center gap-1">
        {themeOptions.map((option) => {
          const isActive = activeTheme === option.value;

          return (
            <Button
              key={option.value}
              aria-pressed={isActive}
              className="rounded-full px-3 text-xs"
              onClick={() => setTheme(option.value)}
              size="sm"
              variant={isActive ? "secondary" : "ghost"}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}