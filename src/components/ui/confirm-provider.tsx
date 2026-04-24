"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type ConfirmTone = "default" | "danger";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
};

type ConfirmRequest = {
  options: ConfirmOptions;
  resolve: (result: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [activeRequest, setActiveRequest] = useState<ConfirmRequest | null>(null);
  const queueRef = useRef<ConfirmRequest[]>([]);
  const activeRequestRef = useRef<ConfirmRequest | null>(null);

  const showNextRequest = useCallback(() => {
    if (activeRequestRef.current) {
      return;
    }

    const next = queueRef.current.shift() ?? null;

    if (!next) {
      return;
    }

    activeRequestRef.current = next;
    setActiveRequest(next);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        queueRef.current.push({ options, resolve });
        showNextRequest();
      });
    },
    [showNextRequest],
  );

  const resolveActiveRequest = useCallback(
    (result: boolean) => {
      const current = activeRequestRef.current;

      if (!current) {
        return;
      }

      current.resolve(result);
      activeRequestRef.current = null;
      setActiveRequest(null);
      showNextRequest();
    },
    [showNextRequest],
  );

  useEffect(() => {
    if (!activeRequest) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        resolveActiveRequest(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeRequest, resolveActiveRequest]);

  const contextValue = useMemo(() => ({ confirm }), [confirm]);

  const options = activeRequest?.options;
  const title = options?.title ?? "Please confirm";
  const confirmLabel = options?.confirmLabel ?? "Confirm";
  const cancelLabel = options?.cancelLabel ?? "Cancel";
  const tone = options?.tone ?? "default";

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}

      {activeRequest ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-[2px]" role="presentation">
          <Card
            className="w-full max-w-lg border-border bg-card/95 shadow-[0_20px_80px_color-mix(in_oklch,var(--foreground)_20%,transparent)]"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <CardHeader className="p-6">
              <CardTitle>{title}</CardTitle>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{options?.message}</p>
            </CardHeader>

            <CardFooter className="justify-end gap-3 p-6 pt-0">
              <Button onClick={() => resolveActiveRequest(false)} size="sm" variant="outline">
                {cancelLabel}
              </Button>
              <Button onClick={() => resolveActiveRequest(true)} size="sm" variant={tone === "danger" ? "destructive" : "default"}>
                {confirmLabel}
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used inside ConfirmProvider.");
  }

  return context.confirm;
}
