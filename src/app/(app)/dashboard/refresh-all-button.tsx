"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshAllPricesAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

export function RefreshAllButton() {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const run = () => {
    const loadingId = toast.loading(t.dashboard.refresh.loading, {
      details: [t.dashboard.refresh.loadingDetail],
    });
    startTransition(async () => {
      const result = await refreshAllPricesAction();
      toast.dismiss(loadingId);
      if (result?.message) {
        const details: string[] = [];
        if (result.errors?.skipped && result.errors.skipped.length > 0) {
          details.push(t.dashboard.refresh.skippedDetail.replace("{list}", result.errors.skipped.join(", ")));
        }
        if (result.errors?.failures && result.errors.failures.length > 0) {
          details.push(t.dashboard.refresh.failuresDetail.replace("{list}", result.errors.failures.join(" · ")));
        }
        toast.success(result.message, { details: details.length > 0 ? details : undefined });
      } else if (result?.errors?.form) {
        const details: string[] = [];
        if (result.errors.skipped && result.errors.skipped.length > 0) {
          details.push(t.dashboard.refresh.skippedShort.replace("{list}", result.errors.skipped.join(", ")));
        }
        if (result.errors.failures && result.errors.failures.length > 0) {
          details.push(t.dashboard.refresh.failuresDetail.replace("{list}", result.errors.failures.join(" · ")));
        }
        toast.error(result.errors.form[0], { details: details.length > 0 ? details : undefined });
      } else {
        toast.error(t.dashboard.refresh.failed);
      }
    });
  };

  return (
    <button
      type="button"
      disabled={pending}
      title={pending ? t.dashboard.refresh.pending : t.dashboard.refresh.title}
      aria-label={t.dashboard.refresh.aria}
      onClick={run}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-cw bg-bg-elevated text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary disabled:opacity-50",
        pending && "animate-pulse",
      )}
    >
      <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} aria-hidden />
      <span className="sr-only">
        {pending ? t.dashboard.refresh.pending : t.dashboard.refresh.aria}
      </span>
    </button>
  );
}
