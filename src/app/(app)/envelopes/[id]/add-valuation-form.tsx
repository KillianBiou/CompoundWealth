"use client";

import { useActionState } from "react";
import { addEnvelopeValuationAction, type ActionState } from "@/server/actions";
import { Button, Field, Input } from "@/components/ui";

export function AddValuationForm({ envelopeId }: { envelopeId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addEnvelopeValuationAction,
    {},
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="envelopeId" value={envelopeId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="val-date" error={state?.errors?.date}>
          <Input id="val-date" name="date" type="date" required />
        </Field>
        <Field label="Valeur (€)" htmlFor="val-value" error={state?.errors?.valueEur}>
          <Input
            id="val-value"
            name="valueEur"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            placeholder="12 345,67"
          />
        </Field>
      </div>
      <p className="text-xs text-text-muted">
        Une valorisation par date : une nouvelle saisie à la même date remplace l&apos;ancienne.
        Rythme conseillé : une fois par mois.
      </p>
      {state?.message && !state.errors ? (
        <p role="status" className="text-sm text-positive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Enregistrement…" : "Enregistrer la valorisation"}
      </Button>
    </form>
  );
}
