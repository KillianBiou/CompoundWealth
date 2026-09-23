"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { createLivretDcaAction, deleteDcaLineAction, toggleDcaLineAction, type ActionState } from "@/server/actions";
import {
  DCA_FREQUENCY_LABELS,
  nextDateForDay,
  nextOccurrence,
  type DcaFrequency,
} from "@/lib/dca";
import { formatEurCents } from "@/lib/money";
import { Badge, Button, Card, Field, Input, Modal, Select } from "@/components/ui";
import { useActionToast } from "@/components/use-action-toast";
import { useToast } from "@/components/toast";

export interface LivretDcaRow {
  lineId: string;
  planId: string;
  frequency: DcaFrequency;
  startDate: Date;
  maxAmountCents: number;
  active: boolean;
}

function nextDateLabel(row: LivretDcaRow): { label: string; relative: string } {
  if (!row.active) return { label: "—", relative: "en pause" };
  const next = nextOccurrence({ frequency: row.frequency, startDate: row.startDate });
  const daysUntil = Math.round(
    (new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime() -
      new Date().setHours(0, 0, 0, 0)) /
      86_400_000,
  );
  return {
    label: next.toLocaleDateString("fr-FR"),
    relative:
      daysUntil <= 0 ? "aujourd'hui" : daysUntil === 1 ? "demain" : `dans ${daysUntil} jours`,
  };
}

export function LivretDcaSection({
  envelopeId,
  plans,
}: {
  envelopeId: string;
  plans: LivretDcaRow[];
}) {
  const [open, setOpen] = useState(false);
  const [startDay, setStartDay] = useState("");
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const [state, action, formPending] = useActionState<ActionState, FormData>(
    createLivretDcaAction,
    {},
  );
  useActionToast(state, () => setOpen(false));

  const startDayNumber = Number(startDay);
  const startDate =
    startDay.trim() !== "" &&
    Number.isFinite(startDayNumber) &&
    startDayNumber >= 1 &&
    startDayNumber <= 31
      ? nextDateForDay(startDayNumber).toISOString().slice(0, 10)
      : "";

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between border-b border-border-cw p-6 pb-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Versements réguliers</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Planifiez vos virements automatiques vers ce livret — planification uniquement,
            aucun mouvement automatique.
          </p>
        </div>
        <Badge tone="neutral">{plans.filter((p) => p.active).length}</Badge>
      </div>

      {plans.length === 0 ? (
        <p className="px-6 pb-2 pt-4 text-sm text-text-secondary">
          Aucun versement régulier planifié pour le moment.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-cw/70 text-left text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-6 py-3 font-medium">Montant</th>
                <th scope="col" className="px-6 py-3 font-medium">Périodicité</th>
                <th scope="col" className="px-6 py-3 font-medium">Prochaine échéance</th>
                <th scope="col" className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((row) => {
                const next = nextDateLabel(row);
                return (
                  <tr key={row.lineId} className="border-b border-border-cw/40 last:border-0">
                    <td className="px-6 py-3.5">
                      <span
                        className={
                          row.active
                            ? "font-medium tabular-nums text-positive"
                            : "font-medium tabular-nums text-text-muted line-through"
                        }
                      >
                        {formatEurCents(row.maxAmountCents)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-text-secondary">
                      {DCA_FREQUENCY_LABELS[row.frequency]}
                    </td>
                    <td className="px-6 py-3.5">
                      {row.active ? (
                        <>
                          <span className="tabular-nums text-text-primary">{next.label}</span>
                          <span className="ml-2 text-xs text-text-muted">{next.relative}</span>
                        </>
                      ) : (
                        <span className="text-text-muted italic">En pause</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const formData = new FormData();
                              formData.set("lineId", row.lineId);
                              formData.set("envelopeId", envelopeId);
                              await toggleDcaLineAction(formData);
                              toast.success(
                                row.active
                                  ? "Versement mis en pause — plus de virement planifié"
                                  : `Versement repris — prochaine échéance ${next.label}`,
                              );
                            })
                          }
                          className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-500/60 hover:text-text-primary disabled:opacity-50"
                        >
                          {row.active ? "Mettre en pause" : "Reprendre"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            startTransition(async () => {
                              const formData = new FormData();
                              formData.set("lineId", row.lineId);
                              formData.set("envelopeId", envelopeId);
                              await deleteDcaLineAction(formData);
                              toast.success("Versement régulier supprimé");
                            })
                          }
                          className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-negative/60 hover:text-negative disabled:opacity-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStartDay(String(new Date().getDate()));
        }}
        className="flex w-full cursor-pointer items-center justify-center gap-2 border-t border-border-cw px-6 py-3 text-sm text-text-muted transition-colors hover:bg-bg-subtle hover:text-text-secondary"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Planifier un versement régulier
      </button>

      {open ? (
        <Modal title="Planifier un versement régulier" onClose={() => setOpen(false)}>
          <form action={action} className="space-y-4" noValidate>
            <input type="hidden" name="envelopeId" value={envelopeId} />
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="livret-dca-frequency"
                  className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
                >
                  Périodicité
                </label>
                <Select id="livret-dca-frequency" name="frequency" defaultValue="MONTHLY">
                  {(Object.entries(DCA_FREQUENCY_LABELS) as [DcaFrequency, string][]).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="livret-dca-start"
                  className="mb-1 block text-xs uppercase tracking-wide text-text-muted"
                >
                  Jour de départ
                </label>
                <Input
                  id="livret-dca-start"
                  name="startDate"
                  type="number"
                  min="1"
                  max="31"
                  inputMode="numeric"
                  placeholder="Ex. 5"
                  value={startDay}
                  onChange={(e) => setStartDay(e.target.value)}
                  required
                />
                {startDate ? (
                  <p className="mt-1 text-xs text-text-muted">
                    Premier versement le {new Date(startDate).toLocaleDateString("fr-FR")}
                  </p>
                ) : null}
              </div>
            </div>
            <Field
              label="Montant par versement (€)"
              htmlFor="livret-dca-amount"
              error={state?.errors?.maxAmountEur}
              hint="Exemple : 200 € chaque mois — les versements sont bloqués au plafond de 22 950 €"
            >
              <Input
                id="livret-dca-amount"
                name="maxAmountEur"
                type="number"
                step="0.01"
                min="0.01"
                inputMode="decimal"
                placeholder="200,00"
                required
              />
            </Field>
            {state?.errors?.form ? (
              <p role="alert" className="text-sm text-negative">
                {state.errors.form[0]}
              </p>
            ) : null}
            <Button type="submit" disabled={formPending} className="w-full sm:w-auto">
              {formPending ? "Planification…" : "Confirmer le versement régulier"}
            </Button>
          </form>
        </Modal>
      ) : null}
    </Card>
  );
}
