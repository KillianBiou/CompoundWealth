"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { setLocaleAction } from "@/i18n/locale-actions";
import type { Locale } from "@/i18n/server";
import { cn } from "./cn";

const OPTIONS: { value: Locale; label: string; flag: string }[] = [
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
];

/**
 * Sélecteur de langue : drapeau de la langue courante, clic = menu
 * déroulant avec les options. À droite de la déconnexion.
 */
export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  const select = (value: Locale) => {
    setOpen(false);
    if (value === locale) return;
    startTransition(async () => {
      await setLocaleAction(value);
      router.refresh();
    });
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.language.switchTo}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-border-cw bg-bg-subtle/50 px-2 py-1.5 text-sm transition-colors hover:border-accent-500/40 hover:text-text-primary",
          pending && "opacity-60",
        )}
      >
        <span className="text-base leading-none" aria-hidden>
          {current.flag}
        </span>
        {!compact ? <span className="text-xs font-medium">{current.label}</span> : null}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-text-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={t.language.label}
          className="absolute bottom-full right-0 z-30 mb-2 w-40 overflow-hidden rounded-lg border border-border-cw bg-bg-elevated shadow-xl"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === locale}
              onClick={() => select(option.value)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-subtle",
                option.value === locale
                  ? "text-accent-500"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <span className="text-base leading-none" aria-hidden>
                {option.flag}
              </span>
              <span className="flex-1">{option.label}</span>
              {option.value === locale ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
