"use client";

import { useActionState, useState } from "react";
import { createEnvelopeAction, type ActionState } from "@/server/actions";
import { ENVELOPE_RULES, type EnvelopeType } from "@/lib/taxes";
import { Badge, Button, Card, Field, Input, cn } from "@/components/ui";

const types: { value: EnvelopeType; title: string; description: string; recommended?: boolean }[] = [
  {
    value: "PEA",
    title: "PEA",
    description: "Actions et ETF éligibles UE. Plafond 150 000 €, exonération d'IR après 5 ans.",
    recommended: true,
  },
  {
    value: "CTO",
    title: "CTO",
    description: "Univers illimité, sans plafond. Flat tax 31,4 % sur les gains.",
  },
];

export function NewEnvelopeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createEnvelopeAction,
    {},
  );
  const [type, setType] = useState<EnvelopeType>("PEA");
  const rules = ENVELOPE_RULES[type];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <div className="grid gap-4 sm:grid-cols-2">
        {types.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            aria-pressed={type === t.value}
            className={cn(
              "rounded-lg border p-4 text-left transition-colors",
              type === t.value
                ? "border-accent-500 bg-accent-100/40"
                : "border-border-cw bg-bg-elevated hover:border-accent-500/40",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-heading font-semibold">{t.title}</span>
              {t.recommended ? <Badge tone="accent">Recommandé</Badge> : null}
            </div>
            <p className="mt-1 text-sm text-text-secondary">{t.description}</p>
          </button>
        ))}
      </div>

      <Card className="space-y-2 p-4">
        <p className="text-sm font-medium">Conditions fiscales {type} ({`taux ${new Date().getFullYear()}`})</p>
        <div className="flex flex-wrap gap-2">
          {rules.badges.map((b) => (
            <Badge key={b} tone={type === "PEA" && b.includes("Exonération") ? "positive" : "warning"}>
              {b}
            </Badge>
          ))}
          <Badge tone="neutral">Prélèvements sociaux 18,6 %</Badge>
        </div>
        <p className="text-xs text-text-muted">
          {type === "PEA"
            ? "Le retrait avant 5 ans entraîne la clôture du plan (sauf cas légaux). La date d'ouverture déclenche le compte à rebours."
            : "Fiscalité identique quelle que soit la durée de détention. Option barème progressif possible à la déclaration."}
        </p>
      </Card>

      <Field label="Nom de l'enveloppe" htmlFor="name" error={state?.errors?.name}>
        <Input id="name" name="name" required placeholder={type === "PEA" ? "PEA Bourse" : "CTO Diversification"} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Courtier" htmlFor="broker" error={state?.errors?.broker} hint="Optionnel">
          <Input id="broker" name="broker" placeholder="Ex. Trade Republic" />
        </Field>
        <Field
          label="Date d'ouverture"
          htmlFor="openedAt"
          error={state?.errors?.openedAt}
          hint={type === "PEA" ? "Recommandée pour le PEA (antériorité fiscale)" : "Optionnelle"}
        >
          <Input id="openedAt" name="openedAt" type="date" />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Création…" : "Créer l'enveloppe"}
      </Button>
    </form>
  );
}
