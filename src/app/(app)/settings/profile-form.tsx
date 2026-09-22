"use client";

import { useActionState } from "react";
import { updateProfileAction, type ActionState } from "@/server/actions";
import { Button, Card, Field, Input } from "@/components/ui";

export function ProfileForm({
  email,
  name,
  age,
  job,
  salaryEur,
}: {
  email: string;
  name: string;
  age: string;
  job: string;
  salaryEur: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateProfileAction,
    {},
  );

  return (
    <Card>
      <form action={action} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email-static">
          <Input id="email-static" value={email} disabled aria-describedby="email-locked" />
          <p id="email-locked" className="text-xs text-text-muted">
            L&apos;email sert de connexion et ne peut pas être modifié.
          </p>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" htmlFor="pf-name" error={state?.errors?.name}>
            <Input id="pf-name" name="name" defaultValue={name} placeholder="Optionnel" />
          </Field>
          <Field label="Âge" htmlFor="pf-age" error={state?.errors?.age}>
            <Input id="pf-age" name="age" type="number" min="18" max="120" defaultValue={age} placeholder="Optionnel" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Travail" htmlFor="pf-job" error={state?.errors?.job}>
            <Input id="pf-job" name="job" defaultValue={job} placeholder="Optionnel" />
          </Field>
          <Field label="Salaire mensuel net (€)" htmlFor="pf-salary" error={state?.errors?.salaryEur}>
            <Input
              id="pf-salary"
              name="salaryEur"
              type="number"
              step="0.01"
              min="0"
              defaultValue={salaryEur}
              placeholder="Optionnel"
            />
          </Field>
        </div>
        {state?.message ? (
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
