"use client";

import { useActionState } from "react";
import { updatePreferencesAction, type ActionState } from "@/server/actions";
import { CURRENCIES, NUMBER_LOCALES } from "@/lib/money";
import { Button, Card, Field, Select } from "@/components/ui";

export function PreferencesForm({
  currency,
  numberLocale,
}: {
  currency: string;
  numberLocale: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updatePreferencesAction,
    {},
  );

  return (
    <Card>
      <form action={action} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Devise" htmlFor="pref-currency">
            <Select id="pref-currency" name="currency" defaultValue={currency}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Format des nombres"
            htmlFor="pref-locale"
            hint="Séparateurs de milliers et de décimales"
          >
            <Select id="pref-locale" name="numberLocale" defaultValue={numberLocale}>
              {NUMBER_LOCALES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {state.message ? (
          <p
            role="status"
            className={state.errors ? "text-sm text-negative" : "text-sm text-positive"}
          >
            {state.message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </Card>
  );
}
