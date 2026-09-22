"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/server/actions";
import { Button, Field, Input } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message ? (
        <p role="alert" className="rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.message}
        </p>
      ) : null}
      <Field label="Email" htmlFor="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mot de passe" htmlFor="password" error={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
