"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/components/cn";

/**
 * Ligne d'information d'une fiche (label + valeur) avec description au
 * survol : un point d'interrogation s'affiche à côté du label et une
 * bulle d'explication apparaît à l'hover.
 */
export function InfoRow({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  /** explication détaillée affichée au survol du point d'interrogation */
  hint?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex items-baseline justify-between gap-4 border-b border-border-cw/40 py-1.5 last:border-0">
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-xs text-text-muted",
          hint ? "cursor-help" : undefined,
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        tabIndex={hint ? 0 : undefined}
      >
        {label}
        {hint ? (
          <HelpCircle
            className="h-3 w-3 text-text-muted/70 transition-colors hover:text-accent-500"
            aria-hidden
          />
        ) : null}
        {hint && open ? (
          <span
            role="tooltip"
            className="absolute bottom-full left-0 z-20 mb-1 w-56 rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs font-normal leading-relaxed text-text-secondary shadow-lg"
          >
            {hint}
          </span>
        ) : null}
      </span>
      <span className="text-right text-sm text-text-primary">{value ?? children}</span>
    </div>
  );
}
