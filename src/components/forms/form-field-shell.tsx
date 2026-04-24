import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldShellProps = {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  footer?: ReactNode;
  htmlFor?: string;
  label: ReactNode;
  labelClassName?: string;
  required?: boolean;
};

export function FormFieldShell({
  children,
  className,
  description,
  error,
  footer,
  htmlFor,
  label,
  labelClassName,
  required,
}: FormFieldShellProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className={cn("block text-sm font-medium text-foreground", labelClassName)} htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {children}
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
      {footer ? <div>{footer}</div> : null}
    </div>
  );
}