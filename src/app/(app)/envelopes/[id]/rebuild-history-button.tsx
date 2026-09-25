"use client";

import { useTransition } from "react";
import { History } from "lucide-react";
import { rebuildHistoryAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

export function RebuildHistoryButton({ envelopeId }: { envelopeId: string }) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const { t } = useI18n();

  return (
    <button
      type="button"
      disabled={pending}
      title={pending ? t.envelopes.rebuild.pendingTitle : t.envelopes.rebuild.title}
      aria-label={t.envelopes.rebuild.aria}
      onClick={() => {
        const loadingId = toast.loading(t.envelopes.rebuild.loading, {
          details: [t.envelopes.rebuild.loadingDetail],
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
        {pending ? t.envelopes.rebuild.pendingSr : t.envelopes.rebuild.sr}
      </span>
    </button>
  );
}
