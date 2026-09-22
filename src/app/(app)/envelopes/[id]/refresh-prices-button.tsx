"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPricesAction } from "@/server/actions";
import { cn } from "@/components/ui";

export function RefreshPricesButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={pending ? "Actualisation en cours…" : "Actualiser les prix actuels de toutes les positions (source ouverte Yahoo Finance, limité à une fois toutes les 5 minutes)"}
      aria-label="Actualiser les prix des positions"
      onClick={() =>
        startTransition(async () => {
          await refreshPricesAction(envelopeId);
        })
      }
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-cw bg-bg-elevated text-text-secondary transition-colors hover:text-text-primary hover:border-accent-500/50 disabled:opacity-50",
      )}
    >
      <RefreshCw className="h-4 w-4" aria-hidden />
      {pending ? <span className="sr-only">Actualisation en cours…</span> : null}
    </button>
  );
}
