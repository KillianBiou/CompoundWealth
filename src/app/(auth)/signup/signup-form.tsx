"use client";

import { useActionState } from "react";
import { signupAction, type ActionState } from "@/server/actions";
import { Button, Field, Input } from "@/components/ui";

export function SignupForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(signupAction, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vous@exemple.fr" />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        error={state?.errors?.password}
        hint="8 caractères minimum"
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Création…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
