"use client";

import { useTransition } from "react";
import { deleteDcaLineAction, toggleDcaLineAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

export interface DcaTableRow {
  id: string;
  ticker: string;
  name: string;
  maxAmountCents: number;
  frequencyLabel: string;
  nextDateLabel: string | null;
  nextDateRelative: string | null;
  estimateLabel: string | null;
  active: boolean;
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function ToggleButton({ row, envelopeId }: { row: DcaTableRow; envelopeId: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("lineId", row.id);
          formData.set("envelopeId", envelopeId);
          await toggleDcaLineAction(formData);
          toast.success(
            row.active
              ? t.envelopes.dca.table.pauseToast.replace("{ticker}", row.ticker)
              : t.envelopes.dca.table.resumeToast
                  .replace("{ticker}", row.ticker)
                  .replace("{date}", row.nextDateLabel ?? t.envelopes.dca.table.resumeDateUnknown),
          );
        });
      }}
      className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary disabled:opacity-50"
    >
      {row.active ? t.envelopes.dca.table.pause : t.envelopes.dca.table.resume}
    </button>
  );
}

function DeleteButton({ row, envelopeId }: { row: DcaTableRow; envelopeId: string }) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("lineId", row.id);
          formData.set("envelopeId", envelopeId);
          await deleteDcaLineAction(formData);
          toast.success(t.envelopes.dca.table.deleteToast.replace("{ticker}", row.ticker));
        });
      }}
      className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:border-negative/60 hover:text-negative disabled:opacity-50"
    >
      {t.envelopes.dca.table.delete}
    </button>
  );
}

export function DcaTable({ envelopeId, rows }: { envelopeId: string; rows: DcaTableRow[] }) {
  const { t } = useI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border-cw bg-bg-subtle/50 text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-6 py-3 font-medium">{t.envelopes.dca.table.security}</th>
            <th className="px-4 py-3 font-medium">{t.envelopes.dca.table.maxAmount}</th>
            <th className="px-4 py-3 font-medium">{t.envelopes.dca.table.frequency}</th>
            <th className="px-4 py-3 font-medium">{t.envelopes.dca.table.nextDate}</th>
            <th className="px-6 py-3 text-right font-medium" aria-label={t.common.edit} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-border-cw/40 transition-colors hover:bg-bg-subtle/30",
                !row.active && "opacity-50",
              )}
            >
              <td className="px-6 py-3">
                <span className="font-medium text-text-primary">{row.ticker}</span>
                <span className="block text-xs text-text-secondary">{row.name}</span>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                <span className="font-semibold text-positive">{formatEur(row.maxAmountCents)}</span>
                {row.estimateLabel ? (
                  <span className="block text-xs text-text-muted">{row.estimateLabel}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-secondary">{row.frequencyLabel}</td>
              <td className="px-4 py-3 tabular-nums">
                {row.active ? (
                  <>
                    <span className="text-text-primary">{row.nextDateLabel}</span>
                    {row.nextDateRelative ? (
                      <span className="block text-xs text-accent-500">
                        {row.nextDateRelative}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="italic text-text-muted">{t.envelopes.dca.table.paused}</span>
                )}
              </td>
              <td className="px-6 py-3">
                <div className="flex items-center justify-end gap-3">
                  <ToggleButton row={row} envelopeId={envelopeId} />
                  <DeleteButton row={row} envelopeId={envelopeId} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
