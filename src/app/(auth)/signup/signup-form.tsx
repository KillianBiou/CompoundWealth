"use client";

import { useActionState } from "react";
import { signupAction, type ActionState } from "@/server/actions";
import { Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export function SignupForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(signupAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={t.auth.email} htmlFor="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vous@exemple.fr" />
      </Field>
      <Field
        label={t.auth.password}
        htmlFor="password"
        error={state?.errors?.password}
        hint={t.auth.passwordHint}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.auth.signupPending : t.auth.signupButton}
      </Button>
    </form>
  );
}
