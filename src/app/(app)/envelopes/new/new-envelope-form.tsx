"use client";

import { useActionState, useState } from "react";
import { createEnvelopeAction, type ActionState } from "@/server/actions";
import { ENVELOPE_RULES, type EnvelopeType } from "@/lib/taxes";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { cn } from "@/components/cn";
import { useActionToast } from "@/components/use-action-toast";

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
  {
    value: "LIVRET_A",
    title: "Livret A",
    description:
      "Épargne réglementée : plafond 22 950 €, taux 1,7 %, exonérée d'impôt. Sans positions — suivi du solde et DCA.",
  },
];

export function NewEnvelopeForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createEnvelopeAction,
    {},
  );
  useActionToast(state);
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

      {type === "LIVRET_A" ? (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">Livret A — épargne réglementée {new Date().getFullYear()}</p>
          <div className="flex flex-wrap gap-2">
            <Badge tone="positive">Intérêts exonérés d&apos;IR et de prélèvements sociaux</Badge>
            <Badge tone="neutral">Taux 1,7 % par an</Badge>
            <Badge tone="warning">Plafond de dépôt 22 950 €</Badge>
          </div>
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Sans positions</span> — le livret
            est suivi comme un solde : versements, retraits et intérêts calculés par quinzaine
            (capitalisés au 31 décembre). Un DCA de versements réguliers est possible.
          </p>
          <p className="text-xs text-text-muted">
            Au-delà du plafond de 22 950 €, les versements ne sont pas rémunérés. Le taux
            actuel (1,7 % depuis le 1er août 2026) et le taux d&apos;inflation sont ajustables
            dans l&apos;enveloppe pour estimer l&apos;évolution réelle de votre pouvoir d&apos;achat.
          </p>
        </Card>
      ) : (
        <Card className="space-y-2 p-4">
          <p className="text-sm font-medium">Conditions fiscales {type} — {new Date().getFullYear()}</p>
          <div className="flex flex-wrap gap-2">
            {rules.badges.map((b) => (
              <Badge key={b} tone={type === "PEA" && b.includes("Exonération") ? "positive" : "warning"}>
                {b}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">Flat tax 31,4 %</span> = 12,8 %
            d&apos;impôt sur le revenu + 18,6 % de prélèvements sociaux
            {type === "PEA" ? " (avant 5 ans)" : " (dividendes, intérêts et plus-values)"}
          </p>
          {type === "PEA" ? (
            <p className="text-xs text-text-muted">
              Après 5 ans : exonération d&apos;impôt sur le revenu, seuls les prélèvements sociaux
              (18,6 %) restent dus sur les gains. Le retrait avant 5 ans entraîne la clôture du
              plan (sauf cas légaux).
            </p>
          ) : (
            <p className="text-xs text-text-muted">
              Fiscalité identique quelle que soit la durée de détention. Option barème progressif
              possible à la déclaration annuelle.
            </p>
          )}
        </Card>
      )}

      <Field label="Nom de l'enveloppe" htmlFor="name" error={state?.errors?.name}>
        <Input
          id="name"
          name="name"
          required
          placeholder={
            type === "PEA" ? "PEA Bourse" : type === "CTO" ? "CTO Diversification" : "Livret A épargne"
          }
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Courtier" htmlFor="broker" error={state?.errors?.broker} hint="Optionnel">
          <Input id="broker" name="broker" placeholder="Ex. Trade Republic" />
        </Field>
        <Field
          label="Date d'ouverture"
          htmlFor="openedAt"
          error={state?.errors?.openedAt}
          hint={
            type === "PEA"
              ? "Recommandée pour le PEA (antériorité fiscale)"
              : type === "LIVRET_A"
                ? "Utilisée pour le calcul des intérêts par quinzaine"
                : "Optionnelle"
          }
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
