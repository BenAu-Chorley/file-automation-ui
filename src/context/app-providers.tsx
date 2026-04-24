"use client";

import type { ReactNode } from "react";

import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { ThemeProvider } from "@/context/theme-provider";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ThemeProvider>
  );
}