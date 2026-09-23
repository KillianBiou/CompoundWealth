"use client";

import { useTransition } from "react";
import { History } from "lucide-react";
import { rebuildHistoryAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";

export function RebuildHistoryButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      title={
        pending
          ? "Reconstruction en cours…"
          : "Reconstruire l'historique quotidien de toutes les positions depuis Yahoo Finance (1 requête par position, remplace les valorisations importées)"
      }
      aria-label="Reconstruire l'historique des cours"
      onClick={() => {
        const loadingId = toast.loading("Reconstruction de l'historique…", {
          details: ["Une requête par position — cela peut prendre un moment."],
        });
        startTransition(async () => {
          const result = await rebuildHistoryAction(envelopeId);
          toast.dismiss(loadingId);
          if (result?.errors?.form) {
            toast.error(result.errors.form[0]);
          } else if (result?.message) {
            toast.success(result.message);
          }
        });
      }}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-cw bg-bg-elevated text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary disabled:opacity-50",
        pending && "animate-pulse",
      )}
    >
      <History className="h-4 w-4" aria-hidden />
      <span className="sr-only">
        {pending ? "Reconstruction en cours…" : "Reconstruire l'historique"}
      </span>
    </button>
  );
}
