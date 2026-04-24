import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeedbackTone = "neutral" | "success" | "error";

const toneClasses: Record<FeedbackTone, string> = {
  neutral: "border-border bg-card/90 text-muted-foreground",
  success: "border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/35 dark:text-emerald-100",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

type InlineFeedbackProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: FeedbackTone;
  title?: string;
  message: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
};

export function InlineFeedback({
  action,
  className,
  message,
  onDismiss,
  title,
  tone = "neutral",
  ...props
}: InlineFeedbackProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold text-foreground">{title}</p> : null}
        <div className="min-w-0 whitespace-pre-line">{message}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        {onDismiss ? (
          <Button
            aria-label="Dismiss notification"
            className="h-6 w-6 rounded-full px-0 text-current opacity-80 hover:opacity-100"
            onClick={onDismiss}
            size="icon"
            variant="ghost"
          >
            x
          </Button>
        ) : null}
      </div>
    </div>
  );
}

type ListStatePanelProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: FeedbackTone;
  title?: string;
  description: React.ReactNode;
  action?: React.ReactNode;
};

export function ListStatePanel({
  action,
  className,
  description,
  title,
  tone = "neutral",
  ...props
}: ListStatePanelProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed px-4 py-5 text-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      <div className="space-y-1.5">
        {title ? <p className="font-semibold text-foreground">{title}</p> : null}
        <div className="leading-6">{description}</div>
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}