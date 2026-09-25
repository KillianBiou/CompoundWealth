"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "@/server/actions";
import { Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export function LoginForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.message ? (
        <p role="alert" className="rounded-lg border border-negative/40 bg-negative/10 px-3 py-2 text-sm text-negative">
          {state.message}
        </p>
      ) : null}
      <Field label={t.auth.email} htmlFor="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label={t.auth.password} htmlFor="password" error={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.auth.loginPending : t.auth.loginButton}
      </Button>
    </form>
  );
}
