"use client";

import { useEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/components/cn";
import { CopyButton } from "@/components/copy-button";
import { useI18n } from "@/i18n/provider";

/**
 * Panneau latéral droit (façon Sheet/Drawer) : s'ouvre en glide depuis la
 * droite, se ferme par la croix, la touche Échap ou un clic hors zone.
 * Si onBack est fourni, un bouton retour apparaît à gauche du titre.
 */
export function SidePanel({
  open,
  onClose,
  onBack,
  backLabel,
  copyText,
  copyLabel,
  title,
  subtitle,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** revient au panneau précédent (navigation interne), si fourni */
  onBack?: () => void;
  /** libellé accessible du bouton retour (défaut : « Retour ») */
  backLabel?: string;
  /** texte copié par le bouton presse-papier ; absent = pas de bouton */
  copyText?: string | (() => string);
  /** libellé du contenu copié (toast), défaut : titre du panneau */
  copyLabel?: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border-cw bg-bg-elevated shadow-2xl"
        style={{ animation: "side-panel-in 220ms ease-out" }}
      >
        <style>{`
          @keyframes side-panel-in {
            from { transform: translateX(24px); opacity: 0.4; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
        <div className="flex items-start justify-between gap-4 border-b border-border-cw px-6 py-4">
          <div className="flex items-start gap-3">
            {icon ? (
              <span
                className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500"
                aria-hidden
              >
                {icon}
              </span>
            ) : null}
            <div>
              <h2 className="font-heading text-lg font-semibold text-text-primary">{title}</h2>
              {subtitle ? (
                <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {copyText !== undefined ? (
              <CopyButton text={copyText} label={copyLabel ?? title} variant="icon" />
            ) : null}
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label={backLabel ?? t.analyse.detail.common.back}
                title={backLabel ?? t.analyse.detail.common.back}
                className="rounded-lg p-1.5 text-text-muted transition-all hover:bg-bg-subtle hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.analyse.detail.common.closePanel}
              className="rounded-lg p-1.5 text-text-muted transition-all hover:bg-bg-subtle hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
        <div className={cn("flex-1 overflow-y-auto px-6 py-5")}>{children}</div>
      </div>
    </div>
  );
}
