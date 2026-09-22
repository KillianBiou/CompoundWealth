"use client";

import { useActionState } from "react";
import { updateDepositsAction, type ActionState } from "@/server/actions";
import { Button, Input } from "@/components/ui";

export function DepositsBadgeForm({
  envelopeId,
  depositsEur,
}: {
  envelopeId: string;
  depositsEur: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateDepositsAction,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-2" noValidate>
      <input type="hidden" name="envelopeId" value={envelopeId} />
      <label htmlFor="deposits-input" className="text-xs text-text-muted">
        Versements (€)
      </label>
      <Input
        id="deposits-input"
        name="depositsEur"
        type="number"
        step="0.01"
        min="0"
        inputMode="decimal"
        defaultValue={depositsEur}
        placeholder="10 000,00"
        className="w-36"
        aria-label="Versements cumulés en euros"
      />
      <Button type="submit" disabled={pending} variant="secondary" className="h-9">
        {pending ? "…" : "OK"}
      </Button>
      {state?.errors?.depositsEur ? (
        <span role="alert" className="text-xs text-negative">
          {state.errors.depositsEur[0]}
        </span>
      ) : null}
      {state?.message && !state.errors ? (
        <span role="status" className="text-xs text-positive">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
