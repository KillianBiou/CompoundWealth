import { Plus } from "lucide-react";
import { getEnvelopeSummaries } from "@/server/queries";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, ButtonLink, Card, Kpi } from "@/components/ui";
import { EnvelopeCard } from "@/components/envelope-card";

export default async function DashboardPage() {
  const envelopes = await getEnvelopeSummaries();
  const totalInvested = envelopes.reduce((s, e) => s + e.investedCents, 0);
  const totalValue = envelopes.reduce((s, e) => s + e.valueCents, 0);
  const totalGain = totalValue - totalInvested;
  const gainRatio = totalInvested > 0 ? totalGain / totalInvested : 0;

  if (envelopes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-semibold">Bienvenue 👋</h1>
        <p className="max-w-md text-text-secondary">
          Créez votre première enveloppe (PEA ou CTO) pour commencer à suivre la croissance de
          votre patrimoine.
        </p>
        <ButtonLink href="/envelopes/new" className="mt-2">
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle enveloppe
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Tableau de bord</h1>
        <ButtonLink href="/envelopes/new" variant="secondary">
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle enveloppe
        </ButtonLink>
      </div>

      <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Kpi label="Total investi" value={formatEurCents(totalInvested)} />
        <Kpi label="Valeur actuelle" value={formatEurCents(totalValue)} />
        <Kpi
          label="Gain / perte"
          value={formatEurCents(Math.abs(totalGain))}
          sub={`${totalGain >= 0 ? "+" : "−"}${formatEurCents(Math.abs(totalGain))} (${formatPercent(gainRatio)})`}
          subTone={totalGain >= 0 ? "positive" : "negative"}
        />
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Mes enveloppes</h2>
        <Badge tone="accent">{envelopes.length} active{envelopes.length > 1 ? "s" : ""}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {envelopes.map((e) => (
          <EnvelopeCard key={e.id} envelope={e} />
        ))}
      </div>
    </div>
  );
}
