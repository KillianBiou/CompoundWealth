import { Plus } from "lucide-react";
import { getEnvelopeSummaries } from "@/server/queries";
import { formatEurCents, formatPercent } from "@/lib/money";
import { aggregateSeries, periodPerformance } from "@/lib/portfolio/series";
import { ButtonLink, Card, Kpi } from "@/components/ui";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";
import { DashboardWealthSection } from "./dashboard-wealth-section";
import type { ChartSeriesToggle } from "./wealth-chart";
import { RefreshAllButton } from "./refresh-all-button";

function periodChange(
  valuations: { date: Date; valueCents: number }[],
  invested: { date: Date; valueCents: number }[],
  period: "1m" | "1y",
) {
  return periodPerformance(valuations, invested, period);
}

export default async function DashboardPage() {
  const envelopes = await getEnvelopeSummaries();
  const t = getDictionary(await getLocaleFromCookies());
  const totalInvested = envelopes.reduce((s, e) => s + e.investedCents, 0);
  const totalValue = envelopes.reduce((s, e) => s + e.valueCents, 0);
  const hasUnknown = envelopes.some((e) => e.hasUnknownInvested);
  const totalGain = hasUnknown ? null : totalValue - totalInvested;
  const gainRatio = totalGain !== null && totalInvested > 0 ? totalGain / totalInvested : null;
  const wealthSeries = aggregateSeries(envelopes.map((e) => e.series));
  const wealthInvestedSeries = aggregateSeries(envelopes.map((e) => e.investedSeries));
  const monthChange = periodChange(wealthSeries, wealthInvestedSeries, "1m");
  const yearChange = periodChange(wealthSeries, wealthInvestedSeries, "1y");
  const envelopeToggles: ChartSeriesToggle[] = envelopes.map((e) => ({
    id: e.id,
    label: e.name,
    kind: e.type === "LIVRET_A" ? "savings" : "equity",
    series: e.series,
    investedSeries: e.investedSeries,
  }));

  if (envelopes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-semibold">{t.dashboard.welcome}</h1>
        <p className="max-w-md text-text-secondary">
          {t.dashboard.welcomeText}
        </p>
        <ButtonLink href="/envelopes/new" className="mt-2">
          <Plus className="h-4 w-4" aria-hidden />
          {t.dashboard.newEnvelope}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t.dashboard.title}</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {t.dashboard.subtitle
              .replace("{count}", String(envelopes.length))
              .replace("{s}", envelopes.length > 1 ? "s" : "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshAllButton />
          <ButtonLink href="/envelopes/new" variant="secondary">
            <Plus className="h-4 w-4" aria-hidden />
            {t.dashboard.newEnvelope}
          </ButtonLink>
        </div>
      </div>

      <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Kpi
          label={t.dashboard.totalInvested}
          value={hasUnknown ? `${formatEurCents(totalInvested)} + ?` : formatEurCents(totalInvested)}
        />
        <Kpi label={t.dashboard.currentValue} value={formatEurCents(totalValue)} />
        {totalGain !== null && gainRatio !== null ? (
          <Kpi
            label={t.dashboard.gainLoss}
            value={formatEurCents(Math.abs(totalGain))}
            sub={`${totalGain >= 0 ? "+" : "−"}${formatEurCents(Math.abs(totalGain))} (${formatPercent(gainRatio)})`}
            subTone={totalGain >= 0 ? "positive" : "negative"}
          />
        ) : (
          <Kpi
            label={t.dashboard.gainLoss}
            value="—"
            sub={t.dashboard.gainUnknown}
          />
        )}
      </Card>

      <DashboardWealthSection
        wealthSeries={wealthSeries}
        envelopeToggles={envelopeToggles}
        envelopes={envelopes}
        monthChangeRatio={monthChange.ratio}
        yearChangeRatio={yearChange.ratio}
      />
    </div>
  );
}
