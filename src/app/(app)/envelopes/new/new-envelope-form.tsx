"use client";
import { useActionState, useState } from "react";
import { createEnvelopeAction, type ActionState } from "@/server/actions";
import { ENVELOPE_RULES, type EnvelopeType } from "@/lib/taxes";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { cn } from "@/components/cn";
import { useActionToast } from "@/components/use-action-toast";
import { useI18n } from "@/i18n/provider";

const types: { value: EnvelopeType; title: string; recommended?: boolean }[] = [
  { value: "PEA", title: "PEA", recommended: true },
  { value: "CTO", title: "CTO" },
  { value: "LIVRET_A", title: "Livret A" },
  { value: "PRIV", title: "Non coté" },
];

export function NewEnvelopeForm() {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createEnvelopeAction,
    {},
  );
  useActionToast(state);
  const [type, setType] = useState<EnvelopeType>("PEA");
  const rules = ENVELOPE_RULES[type];
  const year = new Date().getFullYear();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-4 sm:grid-cols-2">
        {types.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setType(option.value)}
            aria-pressed={type === option.value}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              type === option.value
                ? "border-accent-500 bg-accent-100/40"
                : "border-border-cw bg-bg-elevated hover:border-accent-500/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold">{option.title}</span>
              {option.recommended ? <Badge tone="accent">{t.envelopes.new.title}</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {t.envelopes.new.types[option.value]}
            </p>
          </button>
        ))}
      </div>
      {type === "PRIV" ? (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">{t.envelopes.new.privTitle}</p>
          <div className="flex flex-wrap gap-2">
            {rules.badges.map((b) => (
              <Badge key={b} tone="warning">
                {b}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-text-secondary">{t.envelopes.new.privTax}</p>
          <p className="text-xs text-text-muted">{t.envelopes.new.privFees}</p>
        </Card>
      ) : type === "LIVRET_A" ? (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">
            {t.envelopes.new.livretTitle.replace("{year}", String(year))}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="positive">{t.envelopes.new.livretBadges.taxFree}</Badge>
            <Badge tone="neutral">{t.envelopes.new.livretBadges.rate}</Badge>
            <Badge tone="warning">{t.envelopes.new.livretBadges.cap}</Badge>
          </div>
          <p className="text-sm text-text-secondary">{t.envelopes.new.livretNoPositions}</p>
          <p className="text-xs text-text-muted">{t.envelopes.new.livretNote}</p>
        </Card>
      ) : (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">
            {t.envelopes.new.taxTitle.replace("{type}", type).replace("{year}", String(year))}
          </p>
          <div className="flex flex-wrap gap-2">
            {rules.badges.map((b) => (
              <Badge key={b} tone={type === "PEA" && b.includes("Exonération") ? "positive" : "warning"}>
                {b}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            {t.envelopes.new.flatTax}
            {type === "PEA" ? t.envelopes.new.peaBefore5 : t.envelopes.new.ctoScope}
          </p>
          {type === "PEA" ? (
            <p className="text-xs text-text-muted">{t.envelopes.new.peaAfter5}</p>
          ) : (
            <p className="text-xs text-text-muted">{t.envelopes.new.ctoNote}</p>
          )}
        </Card>
      )}
      <Field label={t.envelopes.new.name} htmlFor="name" error={state?.errors?.name}>
        <Input
          id="name"
          name="name"
          required
          placeholder={t.envelopes.new.placeholders[type]}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t.envelopes.new.broker} htmlFor="broker" error={state?.errors?.broker} hint={t.envelopes.new.brokerHint}>
          <Input id="broker" name="broker" placeholder={t.envelopes.new.brokerPlaceholder} />
        </Field>
        {type === "LIVRET_A" ? (
          <Field
            label={t.envelopes.new.livretAmount}
            htmlFor="initialAmountEur"
            error={state?.errors?.initialAmountEur}
            hint={t.envelopes.new.livretAmountHint}
          >
            <Input
              id="initialAmountEur"
              name="initialAmountEur"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="10 000,00"
            />
          </Field>
        ) : null}
        <Field
          label={t.envelopes.new.openedAt}
          htmlFor="openedAt"
          error={state?.errors?.openedAt}
          hint={
            type === "PEA"
              ? t.envelopes.new.openedAtPeaHint
              : type === "LIVRET_A"
                ? t.envelopes.new.openedAtLivretHint
                : t.envelopes.new.openedAtHint
          }
        >
          <Input id="openedAt" name="openedAt" type="date" />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? t.envelopes.new.creating : t.envelopes.new.create}
      </Button>
    </form>
  );
}
