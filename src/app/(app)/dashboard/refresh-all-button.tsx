"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshAllPricesAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";

export function RefreshAllButton() {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const run = () => {
    const loadingId = toast.loading(
      "Actualisation des prix de toutes les enveloppes…",
      { details: ["Une requête par position, espacée d'une seconde — cela peut prendre un moment."] },
    );
    startTransition(async () => {
      const result = await refreshAllPricesAction();
      toast.dismiss(loadingId);
      if (result?.message) {
        const details: string[] = [];
        if (result.errors?.skipped && result.errors.skipped.length > 0) {
          details.push(`Ignorées (actualisées il y a moins de 5 min) : ${result.errors.skipped.join(", ")}`);
        }
        if (result.errors?.failures && result.errors.failures.length > 0) {
          details.push(`Échecs : ${result.errors.failures.join(" · ")}`);
        }
        toast.success(result.message, { details: details.length > 0 ? details : undefined });
      } else if (result?.errors?.form) {
        const details: string[] = [];
        if (result.errors.skipped && result.errors.skipped.length > 0) {
          details.push(`Ignorées : ${result.errors.skipped.join(", ")}`);
        }
        if (result.errors.failures && result.errors.failures.length > 0) {
          details.push(`Échecs : ${result.errors.failures.join(" · ")}`);
        }
        toast.error(result.errors.form[0], { details: details.length > 0 ? details : undefined });
      } else {
        toast.error("Actualisation impossible");
      }
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      title={
        pending
          ? "Actualisation en cours…"
          : "Actualiser les prix de toutes les positions et reconstruire l'historique des enveloppes qui ont des jours manquants (Yahoo Finance)"
      }
      aria-label="Actualiser toutes les valeurs"
      onClick={run}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-cw bg-bg-elevated text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary disabled:opacity-50",
        pending && "animate-pulse",
      )}
    >
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden />
      <span className="sr-only">
        {pending ? "Actualisation en cours…" : "Actualiser toutes les valeurs"}
      </span>
    </button>
  );
}
