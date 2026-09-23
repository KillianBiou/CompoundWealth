"use client";

import { useTransition } from "react";
import { deleteDcaLineAction, toggleDcaLineAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { cn } from "@/components/cn";

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
              ? `${row.ticker} mis en pause — plus d'achat automatique planifié`
              : `${row.ticker} repris — prochaine échéance ${row.nextDateLabel ?? "à venir"}`,
          );
        });
      }}
      className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary disabled:opacity-50"
    >
      {row.active ? "Mettre en pause" : "Reprendre"}
    </button>
  );
}

function DeleteButton({ row, envelopeId }: { row: DcaTableRow; envelopeId: string }) {
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
          toast.success(`DCA ${row.ticker} supprimé`);
        });
      }}
      className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:border-negative/60 hover:text-negative disabled:opacity-50"
    >
      Supprimer
    </button>
  );
}

export function DcaTable({ envelopeId, rows }: { envelopeId: string; rows: DcaTableRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border-cw bg-bg-subtle/50 text-left text-xs uppercase tracking-wide text-text-muted">
            <th className="px-6 py-3 font-medium">Titre</th>
            <th className="px-4 py-3 font-medium">Montant max</th>
            <th className="px-4 py-3 font-medium">Périodicité</th>
            <th className="px-4 py-3 font-medium">Prochaine échéance</th>
            <th className="px-6 py-3 text-right font-medium" aria-label="Actions" />
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
                  <span className="italic text-text-muted">En pause</span>
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
