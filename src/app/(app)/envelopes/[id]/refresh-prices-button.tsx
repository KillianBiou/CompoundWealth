"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { refreshPricesAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

export function RefreshPricesButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const { t } = useI18n();

  return (
    <button
      type="button"
      disabled={pending}
      title={pending ? t.envelopes.refresh.pendingTitle : t.envelopes.refresh.title}
      aria-label={t.envelopes.refresh.aria}
      onClick={() => {
        const loadingId = toast.loading(t.envelopes.refresh.loading, {
          details: [t.envelopes.refresh.loadingDetail],
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
      <span className="sr-only">{pending ? t.envelopes.refresh.pendingSr : t.envelopes.refresh.sr}</span>
    </button>
  );
}
