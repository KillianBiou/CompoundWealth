"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { updateDepositsAction, type ActionState } from "@/server/actions";
import { formatEurCents } from "@/lib/money";
import { Badge, Button, Field, Input } from "@/components/ui";
import { useActionToast } from "@/components/use-action-toast";
import { useI18n } from "@/i18n/provider";

export function DepositsBadge({
  envelopeId,
  depositsCents,
  depositCapLabel,
}: {
  envelopeId: string;
  depositsCents: number;
  depositCapLabel: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateDepositsAction,
    {},
  );
  useActionToast(state, () => setOpen(false));
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={t.envelopes.deposits.edit}
        className="rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60"
      >
        <Badge tone="accent">
          {t.envelopes.deposits.badge.replace("{amount}", formatEurCents(depositsCents)).replace("{cap}", depositCapLabel)}
        </Badge>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t.envelopes.deposits.edit}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-xl border border-border-cw bg-bg-elevated p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <h3 className="font-heading text-lg font-semibold">
                {t.envelopes.deposits.title}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-text-muted hover:text-text-primary"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form
              action={async (formData) => {
                await action(formData);
                setOpen(false);
              }}
              className="space-y-4"
            >
              <input type="hidden" name="envelopeId" value={envelopeId} />
              <p className="text-sm text-text-secondary">
                {t.envelopes.deposits.text.replace("{cap}", depositCapLabel)}
              </p>
              <p className="text-xs text-text-muted">
                {t.envelopes.deposits.hint}
              </p>
              <Field
                label={t.envelopes.deposits.label}
                htmlFor="deposits-input"
                error={state?.errors?.depositsEur}
              >
                <Input
                  id="deposits-input"
                  name="depositsEur"
                  type="number"
                  step="0.01"
                  min="0"
                  max="500000"
                  inputMode="decimal"
                  defaultValue={(depositsCents / 100).toFixed(2)}
                  placeholder="10 000,00"
                  required
                  autoFocus
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                >
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? t.envelopes.deposits.saving : t.common.save}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
