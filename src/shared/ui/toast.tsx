"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";

export type ToastVariant = "default" | "success" | "danger" | "warning" | "destructive";

export interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  toast: (options: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = "default", duration = 4000 }: Omit<ToastItem, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, variant, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastViewport({
  toasts,
  dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-md gap-2"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: () => void;
}) {
  const isDestructive = item.variant === "danger" || item.variant === "destructive";

  const variantStyles = {
    default: "bg-card border-border text-foreground",
    success: "bg-success/10 border-success/30 text-success",
    danger: "bg-danger/10 border-danger/30 text-danger",
    destructive: "bg-danger/10 border-danger/30 text-danger",
    warning: "bg-warning/10 border-warning/30 text-foreground",
  }[item.variant ?? "default"];

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto flex w-full items-start justify-between gap-3 rounded-lg border p-4 shadow-lg transition-all animate-in slide-in-from-bottom-2",
        variantStyles
      )}
    >
      <div className="flex flex-col gap-1 text-left">
        {item.title && <h5 className="font-semibold text-sm leading-none">{item.title}</h5>}
        {item.description && (
          <p className={cn("text-xs leading-relaxed", isDestructive ? "text-danger" : "text-muted-foreground")}>
            {item.description}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="rounded-md p-1 opacity-70 hover:opacity-100 hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
        aria-label="Dismiss toast"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
