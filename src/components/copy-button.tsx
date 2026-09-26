"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

/**
 * Bouton de copie presse-papier : icône + retour visuel (coche) et toast.
 * Variant "icon" : petit bouton carré (en-têtes, panneaux) ; variant
 * "button" : bouton secondaire avec label (pages).
 */
export function CopyButton({
  text,
  label,
  variant = "icon",
  className,
  title,
}: {
  /** texte copié — chaîne ou fonction pour une copie différée */
  text: string | (() => string);
  /** libellé affiché dans le toast de succès (variante "button" : aussi le label du bouton) */
  label: string;
  variant?: "icon" | "button";
  className?: string;
  title?: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const value = typeof text === "function" ? text() : text;
    const ok = await copyTextToClipboard(value);
    if (ok) {
      setCopied(true);
      toast.success(t.common.copySuccess.replace("{label}", label));
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t.common.copyFail.replace("{label}", label));
    }
  };
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={copy}
        title={title ?? label}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg border border-border-cw bg-bg-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent-500/50 disabled:opacity-50",
          className,
        )}
      >
        {copied ? (
          <Check className="h-4 w-4 text-positive" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={copy}
      title={title ?? t.common.copyAria}
      aria-label={t.common.copyAria}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-cw bg-bg-elevated text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary",
        className,
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-positive" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
