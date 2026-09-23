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
import { CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "./cn";

export type ToastVariant = "success" | "error" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  id?: number;
  variant?: ToastVariant;
  duration?: number | null;
  action?: ToastAction;
}

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
  details?: string[];
  duration: number | null;
  action?: ToastAction;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions & { details?: string[] }) => number;
  success: (message: string, options?: ToastOptions & { details?: string[] }) => number;
  error: (message: string, options?: ToastOptions & { details?: string[] }) => number;
  info: (message: string, options?: ToastOptions & { details?: string[] }) => number;
  loading: (message: string, options?: ToastOptions & { details?: string[] }) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: "border-positive/40", iconColor: "text-positive" },
  error: { icon: XCircle, ring: "border-negative/50", iconColor: "text-negative" },
  info: { icon: Info, ring: "border-accent-500/40", iconColor: "text-accent-500" },
  loading: { icon: Loader2, ring: "border-border-cw", iconColor: "text-text-secondary" },
};

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 5000,
  error: 8000,
  info: 5000,
  loading: 0,
};

let nextToastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (message: string, options: ToastOptions & { details?: string[] } = {}) => {
      const id = options.id ?? nextToastId++;
      const variant = options.variant ?? "info";
      const duration = options.duration ?? DEFAULT_DURATIONS[variant];
      setToasts((current) => {
        const rest = current.filter((t) => t.id !== id);
        if (duration === 0) return [...rest, { id, variant, message, details: options.details, duration, action: options.action }];
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
        return [...rest, { id, variant, message, details: options.details, duration, action: options.action }];
      });
      return id;
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: (message, options) => add(message, { variant: "info", ...options }),
      success: (message, options) => add(message, { variant: "success", ...options }),
      error: (message, options) => add(message, { variant: "error", ...options }),
      info: (message, options) => add(message, { variant: "info", ...options }),
      loading: (message, options) => add(message, { variant: "loading", duration: options?.duration ?? null, details: options?.details, action: options?.action }),
      dismiss,
    }),
    [add, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { icon: Icon, ring, iconColor } = VARIANT_STYLES[toast.variant];
  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border bg-bg-elevated p-4 shadow-xl",
        ring,
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", iconColor, toast.variant === "loading" && "animate-spin")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{toast.message}</p>
        {toast.details && toast.details.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {toast.details.map((detail, index) => (
              <li key={index} className="text-xs text-text-secondary">
                {detail}
              </li>
            ))}
          </ul>
        ) : null}
        {toast.action ? (
          <button
            type="button"
            onClick={toast.action.onClick}
            className="mt-2 cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary"
          >
            {toast.action.label}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Fermer la notification"
        className="shrink-0 cursor-pointer text-text-muted transition-colors hover:text-text-primary"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
