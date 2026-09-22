import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export function Kpi({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "positive" | "negative";
}) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-2xl font-semibold text-text-primary tabular-nums">
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
    </div>
  );
}
