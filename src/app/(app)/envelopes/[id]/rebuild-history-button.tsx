"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import { rebuildHistoryAction } from "@/server/actions";
import { cn } from "@/components/cn";


export function RebuildHistoryButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        title={pending
          ? "Reconstruction en cours…"
          : "Reconstruire l'historique quotidien de toutes les positions depuis Yahoo Finance (1 requête par position, remplace les valorisations importées)"}
        aria-label="Reconstruire l'historique des cours"
        onClick={() =>
          startTransition(async () => {
            const result = await rebuildHistoryAction(envelopeId);
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
        <History className="h-4 w-4" aria-hidden />
        <span className="sr-only">
          {pending ? "Reconstruction en cours…" : "Reconstruire l'historique"}
        </span>
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
