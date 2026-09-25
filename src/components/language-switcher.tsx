"use client";

import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { setLocaleAction } from "@/i18n/locale-actions";
import type { Locale } from "@/i18n/server";
import { cn } from "./cn";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

/**
 * Sélecteur de langue : bouton FR/EN, à droite de la déconnexion.
 */
export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const [pending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border-cw bg-bg-subtle/50 p-0.5",
        pending && "opacity-60",
      )}
      role="group"
      aria-label={t.language.label}
    >
      {!compact ? (
        <Languages className="ml-1 h-3.5 w-3.5 text-text-muted" aria-hidden />
      ) : null}
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              void setLocaleAction(option.value);
            })
          }
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            option.value === locale
              ? "bg-accent-500/15 text-accent-500"
              : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
          )}
          aria-pressed={option.value === locale}
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
          {option.value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
