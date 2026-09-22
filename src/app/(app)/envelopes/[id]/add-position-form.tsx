"use client";

import { useActionState } from "react";
import { createPositionAction, type ActionState } from "@/server/actions";
import { Button, Field, Input, Select } from "@/components/ui";

const categories = [
  { value: "ETF", label: "ETF" },
  { value: "STOCK", label: "Action" },
  { value: "BOND", label: "Obligation" },
  { value: "FUND", label: "Fonds" },
  { value: "OTHER", label: "Autre" },
];

export function AddPositionForm({ envelopeId }: { envelopeId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createPositionAction,
    {},
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="envelopeId" value={envelopeId} />
      <Field label="Nom / ticker" htmlFor="pos-name" error={state?.errors?.name}>
        <Input id="pos-name" name="name" required placeholder="CW8, MSCI World…" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="pos-category" error={state?.errors?.category}>
          <Select id="pos-category" name="category" defaultValue="ETF">
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Montant investi (€)" htmlFor="pos-invested" error={state?.errors?.investedEur}>
          <Input
            id="pos-invested"
            name="investedEur"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            placeholder="500,00"
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date d'achat" htmlFor="pos-date" error={state?.errors?.boughtAt}>
          <Input id="pos-date" name="boughtAt" type="date" required />
        </Field>
        <Field label="Quantité" htmlFor="pos-qty" error={state?.errors?.quantity} hint="Optionnel">
          <Input id="pos-qty" name="quantity" type="number" step="any" min="0" inputMode="decimal" />
        </Field>
        <Field label="Prix unitaire (€)" htmlFor="pos-unit" error={state?.errors?.unitPriceEur} hint="Optionnel">
          <Input id="pos-unit" name="unitPriceEur" type="number" step="0.01" min="0" inputMode="decimal" />
        </Field>
      </div>
      {state?.message && !state.errors ? (
        <p role="status" className="text-sm text-positive">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Ajout…" : "Ajouter la position"}
      </Button>
    </form>
  );
}
