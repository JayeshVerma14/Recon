"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ---------------------------------- progress --------------------------------- */

export function Progress({
  value,
  className,
  tone = "brand",
  size = "default",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "success" | "warning" | "critical" | "neutral";
  size?: "default" | "sm";
}) {
  const bg = {
    brand: "#4664DC",
    success: "#179864",
    warning: "#F59E0B",
    critical: "#DC2626",
    neutral: "#94A3B8",
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "overflow-hidden rounded-full bg-foreground/[0.06]",
        size === "sm" ? "h-1" : "h-1.5",
        className
      )}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: bg }}
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}

/* --------------------------------- skeleton --------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded bg-foreground/[0.05]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        className
      )}
    />
  );
}

/* -------------------------------- empty state -------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(70,100,220,0.10)] text-brand">
          {icon}
        </span>
      )}
      <p className="text-body font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-[42ch] text-body-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* -------------------------------- inline alert ------------------------------- */

export function InlineAlert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "critical" | "success";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const config = {
    info: { bg: "rgba(70,100,220,0.08)", fg: "#2F45A8", Icon: Info },
    warning: { bg: "rgba(245,158,11,0.10)", fg: "#B45309", Icon: AlertTriangle },
    critical: { bg: "rgba(220,38,38,0.08)", fg: "#B91C1C", Icon: AlertTriangle },
    success: { bg: "rgba(23,152,100,0.10)", fg: "#0F7048", Icon: CheckCircle2 },
  }[tone];

  return (
    <div
      className={cn("flex items-start gap-2 rounded-lg p-2.5", className)}
      style={{ background: config.bg }}
    >
      <config.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: config.fg }} aria-hidden />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && (
          <span className="text-helper font-semibold" style={{ color: config.fg }}>
            {title}
          </span>
        )}
        <div className="text-helper" style={{ color: config.fg }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- toast ----------------------------------- */

type Toast = { id: number; message: string; tone: "success" | "critical" | "info" };

const ToastContext = React.createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const seq = React.useRef(0);

  const push = React.useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
              className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 shadow-lg"
            >
              {toast.tone === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
              {toast.tone === "critical" && <AlertTriangle className="h-3.5 w-3.5 text-critical" />}
              {toast.tone === "info" && <Info className="h-3.5 w-3.5 text-brand" />}
              <span className="text-body-sm">{toast.message}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setToasts((t) => t.filter((x) => x.id !== toast.id))}
                className="ml-1 text-muted-foreground transition-colors duration-fast hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
