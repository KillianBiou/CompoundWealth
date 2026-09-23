import { Plus } from "lucide-react";
import { getEnvelopeSummaries } from "@/server/queries";
import { formatEurCents, formatPercent } from "@/lib/money";
import { aggregateSeries } from "@/lib/portfolio/series";
import { Badge, ButtonLink, Card, Kpi } from "@/components/ui";
import { EnvelopeCard } from "@/components/envelope-card";
import { WealthChart } from "./wealth-chart";
import { RefreshAllButton } from "./refresh-all-button";

function periodChange(series: { date: Date; valueCents: number }[], days: number) {
  if (series.length < 2) return null;
  const now = series[series.length - 1].date.getTime();
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  let startValue: number | null = null;
  for (const point of series) {
    if (point.date.getTime() <= cutoff) startValue = point.valueCents;
    else break;
  }
  const start = startValue ?? series[0].valueCents;
  const last = series[series.length - 1].valueCents;
  if (start === 0) return null;
  return (last - start) / start;
}

export default async function DashboardPage() {
  const envelopes = await getEnvelopeSummaries();
  const totalInvested = envelopes.reduce((s, e) => s + e.investedCents, 0);
  const totalValue = envelopes.reduce((s, e) => s + e.valueCents, 0);
  const hasUnknown = envelopes.some((e) => e.hasUnknownInvested);
  const totalGain = hasUnknown ? null : totalValue - totalInvested;
  const gainRatio = totalGain !== null && totalInvested > 0 ? totalGain / totalInvested : null;
  const wealthSeries = aggregateSeries(envelopes.map((e) => e.series));
  const monthChange = periodChange(wealthSeries, 30);
  const yearChange = periodChange(wealthSeries, 365);

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
        <div>
          <h1 className="font-heading text-2xl font-semibold">Tableau de bord</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Votre patrimoine, consolidé sur {envelopes.length} enveloppe{envelopes.length > 1 ? "s" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshAllButton />
          <ButtonLink href="/envelopes/new" variant="secondary">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle enveloppe
          </ButtonLink>
        </div>
      </div>

      <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Kpi
          label="Total investi"
          value={hasUnknown ? `${formatEurCents(totalInvested)} + ?` : formatEurCents(totalInvested)}
        />
        <Kpi label="Valeur actuelle" value={formatEurCents(totalValue)} />
        {totalGain !== null && gainRatio !== null ? (
          <Kpi
            label="Gain / perte"
            value={formatEurCents(Math.abs(totalGain))}
            sub={`${totalGain >= 0 ? "+" : "−"}${formatEurCents(Math.abs(totalGain))} (${formatPercent(gainRatio)})`}
            subTone={totalGain >= 0 ? "positive" : "negative"}
          />
        ) : (
          <Kpi
            label="Gain / perte"
            value="—"
            sub="Certaines positions sont en état des lieux (sans montant investi)"
          />
        )}
      </Card>

      {wealthSeries.length > 1 ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-semibold">Évolution du patrimoine</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {monthChange !== null ? (
                  <>
                    1 mois :{" "}
                    <span className={monthChange >= 0 ? "text-positive" : "text-negative"}>
                      {formatPercent(monthChange)}
                    </span>
                    {" · "}
                  </>
                ) : null}
                1 an :{" "}
                <span className={yearChange !== null ? (yearChange >= 0 ? "text-positive" : "text-negative") : ""}>
                  {yearChange !== null ? formatPercent(yearChange) : "historique insuffisant"}
                </span>
              </p>
            </div>
          </div>
          <WealthChart valuations={wealthSeries} />
        </Card>
      ) : null}

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold">Mes enveloppes</h2>
        <Badge tone="accent">
          {envelopes.length} active{envelopes.length > 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {envelopes.map((e) => (
          <EnvelopeCard key={e.id} envelope={e} />
        ))}
      </div>
    </div>
  );
}
