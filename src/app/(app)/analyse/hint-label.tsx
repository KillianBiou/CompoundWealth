"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/components/cn";

/**
 * Label de KPI ou de section avec description au survol : un point
 * d'interrogation apparaît à côté du texte et une bulle d'explication
 * s'ouvre à l'hover.
 */
export function HintLabel({
  children,
  hint,
  uppercase,
  className,
}: {
  children: React.ReactNode;
  /** explication détaillée affichée au survol */
  hint?: string;
  /** style uppercase des titres de KPI */
  uppercase?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!hint) {
    return (
      <p className={cn(uppercase && "text-xs font-medium tracking-wide text-text-secondary uppercase", className)}>
        {children}
      </p>
    );
  }
  return (
    <p
      className={cn(
        "relative flex cursor-help items-center gap-1",
        uppercase && "text-xs font-medium tracking-wide text-text-secondary uppercase",
        className,
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      <HelpCircle className="h-3 w-3 text-text-muted/70 transition-colors hover:text-accent-500" aria-hidden />
      {open ? (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 z-20 mb-1 w-56 rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs font-normal leading-relaxed text-text-secondary shadow-lg normal-case"
        >
          {hint}
        </span>
      ) : null}
    </p>
  );
}
