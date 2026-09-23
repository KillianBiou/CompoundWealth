"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPricesAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";

export function RefreshPricesButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      title={
        pending
          ? "Actualisation en cours…"
          : "Actualiser les prix actuels de toutes les positions (source ouverte Yahoo Finance, limité à une fois toutes les 5 minutes)"
      }
      aria-label="Actualiser les prix des positions"
      onClick={() => {
        const loadingId = toast.loading("Actualisation des prix…", {
          details: ["Une requête par position, espacée d'une seconde."],
        });
        startTransition(async () => {
          const result = await refreshPricesAction(envelopeId);
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
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden />
      <span className="sr-only">{pending ? "Actualisation en cours…" : "Actualiser les prix"}</span>
    </button>
  );
}
