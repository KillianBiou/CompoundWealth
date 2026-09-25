"use client";

import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { X, HelpCircle } from "lucide-react";

import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<Variant, string> = {
  primary:
    "bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-700 disabled:opacity-50",
  secondary:
    "bg-bg-subtle text-text-primary hover:border-accent-500/50 border border-border-cw disabled:opacity-50",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-subtle disabled:opacity-50",
  danger:
    "border border-negative/60 text-negative hover:bg-negative/10 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-cw bg-bg-elevated p-6",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "positive" | "negative" | "warning" | "accent";
  className?: string;
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-bg-subtle text-text-secondary border-border-cw",
    positive: "bg-positive/10 text-positive border-positive/30",
    negative: "bg-negative/10 text-negative border-negative/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    accent: "bg-accent-100 text-accent-500 border-accent-500/30",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      {children}
      {hint && !error?.length ? <p className="text-xs text-text-muted">{hint}</p> : null}
      {error?.length ? (
        <p className="text-xs text-negative" id={`${htmlFor}-error`}>
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border-cw bg-bg-subtle px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-500 focus:outline-none";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "appearance-none", className)} {...props} />;
}

export interface KpiScoreLine {
  /** libellé du critère, traduit côté appelant */
  label: string;
  /** points obtenus sur le maximum du critère, ex. "-1" ou "+2" */
  delta: string;
  /** couleur du delta selon le résultat du critère */
  tone: "positive" | "negative" | "warning";
}

export function Kpi({
  label,
  value,
  sub,
  subTone,
  hint,
  scoreLines,
  scoreTotal,
  scoreTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "positive" | "negative";
  /** explication au survol de l'icône (bulle comme les fiches ETF) */
  hint?: string;
  /** décomposition ligne par ligne du score, affichée dans la bulle */
  scoreLines?: KpiScoreLine[];
  /** ligne de total du score, ex. "7/10" */
  scoreTotal?: string;
  /** couleur du total selon le score */
  scoreTone?: "positive" | "negative" | "warning";
}) {
  const [open, setOpen] = useState(false);
  const hasTooltip = Boolean(hint || (scoreLines && scoreTotal));
  const deltaColor = (tone: KpiScoreLine["tone"]) =>
    tone === "positive" ? "text-positive" : tone === "warning" ? "text-warning" : "text-negative";
  return (
    <div className="relative">
      <p className="flex items-center gap-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
        {label}
        {hasTooltip ? (
          <HelpCircle
            className="h-3 w-3 cursor-help text-text-muted/70 transition-colors hover:text-accent-500"
            aria-hidden
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            tabIndex={0}
          />
        ) : null}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-2xl font-semibold tabular-nums",
          scoreTone === "positive" && "text-positive",
          scoreTone === "warning" && "text-warning",
          scoreTone === "negative" && "text-negative",
          !scoreTone && "text-text-primary",
        )}
      >
        {value}
      </p>
      {sub ? (
        <p
          className={cn(
            "mt-0.5 text-sm tabular-nums",
            subTone === "positive" && "text-positive",
            subTone === "negative" && "text-negative",
            !subTone && "text-text-secondary",
          )}
        >
          {sub}
        </p>
      ) : null}
      {hasTooltip && open ? (
        <span
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-1 w-56 rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs font-normal leading-relaxed text-text-secondary shadow-lg normal-case"
        >
          {scoreLines && scoreTotal ? (
            <>
              {scoreLines.map((line) => (
                <span key={line.label} className="block whitespace-nowrap">
                  {line.label}{" "}
                  <span className={cn("font-semibold tabular-nums", deltaColor(line.tone))}>
                    {line.delta}
                  </span>
                </span>
              ))}
              <span className="mt-1 block border-t border-border-cw pt-1 font-semibold">
                Total{" "}
                <span
                  className={cn(
                    "tabular-nums",
                    scoreTone === "positive" && "text-positive",
                    scoreTone === "warning" && "text-warning",
                    scoreTone === "negative" && "text-negative",
                    !scoreTone && "text-text-primary",
                  )}
                >
                  {scoreTotal}
                </span>
              </span>
            </>
          ) : (
            hint
          )}
        </span>
      ) : null}
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border-cw bg-bg-elevated p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <button
            type="button"
            className="text-text-muted transition-colors hover:text-text-primary"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
