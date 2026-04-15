import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageShellProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <main
      className={cn("flex w-full flex-1 flex-col", className)}
      {...props}
    >
      <div className="space-y-6">{children}</div>
    </main>
  );
}