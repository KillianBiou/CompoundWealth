"use client";

import { useTransition, useState } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPricesAction } from "@/server/actions";
import { cn } from "@/components/ui";

export function RefreshPricesButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        title={pending
          ? "Actualisation en cours…"
          : "Actualiser les prix actuels de toutes les positions (source ouverte Yahoo Finance, limité à une fois toutes les 5 minutes)"}
        aria-label="Actualiser les prix des positions"
        onClick={() =>
          startTransition(async () => {
            const result = await refreshPricesAction(envelopeId);
            if (result?.errors?.form) {
              setFeedback({ ok: false, text: result.errors.form[0] });
            } else if (result?.message) {
              setFeedback({ ok: true, text: result.message });
            } else {
              setFeedback(null);
            }
          })
        }
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-cw bg-bg-elevated text-text-secondary transition-colors hover:text-text-primary hover:border-accent-500/50 disabled:opacity-50",
          pending && "animate-pulse",
        )}
      >
        <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden />
        <span className="sr-only">{pending ? "Actualisation en cours…" : "Actualiser les prix"}</span>
      </button>
      {feedback ? (
        <p
          className={cn(
            "max-w-[220px] text-right text-xs",
            feedback.ok ? "text-text-secondary" : "text-negative",
          )}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  );
}
