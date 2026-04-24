import type { HTMLAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "neutral" | "success" | "warning" | "error" | "info";

const toneToVariant: Record<StatusTone, "outline" | "success" | "warning" | "destructive" | "info"> = {
  neutral: "outline",
  success: "success",
  warning: "warning",
  error: "destructive",
  info: "info",
};

type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone;
};

export function StatusChip({ className, tone = "neutral", ...props }: StatusChipProps) {
  return <Badge className={cn("normal-case tracking-normal", className)} variant={toneToVariant[tone]} {...props} />;
}