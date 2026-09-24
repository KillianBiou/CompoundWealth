import { notFound } from "next/navigation";
import { getEnvelope, getCurrentUser } from "@/server/queries";
import { getEtfDetailsByIsin, isinOf } from "@/server/analysis";
import { formatEurCents } from "@/lib/money";
import { ENVELOPE_RULES, peaAntiquity } from "@/lib/taxes";
import { buildEnvelopeValuations } from "@/lib/portfolio/series";
import {
  buildLivretBalanceSeries,
  projectOneYear,
  LIVRET_A_DEFAULT_INFLATION,
  LIVRET_A_RATE,
  type LivretEvent,
} from "@/lib/livret";
import { Badge, Card, Kpi } from "@/components/ui";
import { EnvelopeChart } from "./envelope-chart";
import { DepositsBadge } from "./deposits-form";
import { PositionsTableWithPanel } from "./positions-table-with-panel";
import { DcaSection } from "./dca-section";
import { LivretSection } from "./livret-section";
import { LivretDcaSection } from "./livret-dca-section";
import { EnvelopeDangerZone } from "./danger-zone";
import { RefreshPricesButton } from "./refresh-prices-button";
import { RebuildHistoryButton } from "./rebuild-history-button";

export default async function EnvelopePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [envelope, user] = await Promise.all([getEnvelope(id), getCurrentUser()]);
  if (!envelope || envelope.closedAt) notFound();

  const positionsInvestedCents = envelope.positions.reduce(
    (s, p) => s + (p.investedCents ?? 0),
    0,
  );
  const depositsCents = envelope.depositsCents ?? positionsInvestedCents;
  const investedCents = depositsCents;
  const hasUnknownInvested =
    envelope.depositsCents === null &&
    envelope.positions.some((p) => p.investedCents === null);
  const positionsValue = envelope.positions.reduce(
    (s, p) =>
      s +
      (p.valuations.length > 0
        ? p.valuations[p.valuations.length - 1].valueCents
        : (p.investedCents ?? 0)),
    0,
  );
  const valuations = buildEnvelopeValuations(envelope.positions);
  const valueCents = valuations.length > 0 ? valuations[valuations.length - 1].valueCents : positionsValue;
  const investments = envelope.positions.flatMap((p) =>
    p.investments.map((i) => ({ date: i.date, amountCents: i.amountCents })),
  );
  const lastValuationDates = envelope.positions.flatMap((p) =>
    p.valuations.length > 0 ? [p.valuations[p.valuations.length - 1].date] : [],
  );
  const lastValuationDate =
    lastValuationDates.length > 0
      ? new Date(Math.max(...lastValuationDates.map((d) => d.getTime())))
      : null;
  const gainCents = hasUnknownInvested ? null : valueCents - investedCents;
  const gainRatio =
    investedCents > 0 && gainCents !== null ? gainCents / investedCents : null;
  const rules = ENVELOPE_RULES[envelope.type];
  const antiquity =
    envelope.type === "PEA" && envelope.openedAt
      ? peaAntiquity(envelope.openedAt)
      : null;

  if (envelope.type === "LIVRET_A") {
    const livretEvents: LivretEvent[] = envelope.deposits.map((dep) => ({
      date: dep.date,
      amountCents: dep.amountCents,
    }));
    const rate = envelope.interestRate ?? LIVRET_A_RATE;
    const inflation = envelope.inflationRate ?? LIVRET_A_DEFAULT_INFLATION;
    const livretSeries = buildLivretBalanceSeries(livretEvents, rate);
    const nowTime = new Date().getTime();
    const currentPoint =
      [...livretSeries].reverse().find((p) => p.date.getTime() <= nowTime) ?? null;
    const balanceCents = currentPoint ? currentPoint.balanceCents : 0;
    const projection = projectOneYear(livretEvents, rate, inflation);
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold">{envelope.name}</h1>
              <Badge tone="accent">Livret A</Badge>
            </div>
            <p className="mt-1 text-sm text-text-secondary">
              {envelope.broker ? `${envelope.broker} · ` : ""}
              {envelope.openedAt
                ? `Ouvert le ${envelope.openedAt.toLocaleDateString("fr-FR")}`
                : "Date d'ouverture non renseignée"}
            </p>
          </div>
        </div>
        <LivretSection
          envelopeId={envelope.id}
          deposits={envelope.deposits.map((dep) => ({
            id: dep.id,
            date: dep.date,
            amountCents: dep.amountCents,
          }))}
          series={livretSeries}
          balanceCents={balanceCents}
          interestRate={envelope.interestRate}
          inflationRate={envelope.inflationRate}
          projection={
            projection
              ? {
                  interestCents: projection.interestCents,
                  inflationLossCents: projection.inflationLossCents,
                  overCapCents: projection.overCapCents,
                  realBalanceCents: projection.realBalanceCents,
                  realChangeCents: projection.realChangeCents,
                  realRate: projection.realRate,
                }
              : null
          }
        />
        <LivretDcaSection
          envelopeId={envelope.id}
          plans={envelope.dcaPlans.flatMap((plan) =>
            plan.lines.map((line) => ({
              lineId: line.id,
              planId: plan.id,
              frequency: plan.frequency,
              startDate: plan.startDate,
              maxAmountCents: line.maxAmountCents,
              active: plan.active && line.active,
            })),
          )}
        />
        <EnvelopeDangerZone envelopeId={envelope.id} envelopeName={envelope.name} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">{envelope.name}</h1>
            <Badge tone={envelope.type === "PEA" ? "positive" : "warning"}>{envelope.type === "PRIV" ? "Non coté" : envelope.type}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {envelope.broker ? `${envelope.broker} · ` : ""}
            {envelope.openedAt
              ? `Ouvert le ${envelope.openedAt.toLocaleDateString("fr-FR")}`
              : "Date d'ouverture non renseignée"}
          </p>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {rules.badges.map((b) => (
            <Badge key={b} tone={b.includes("Exonération") ? "positive" : "warning"}>
              {b}
            </Badge>
          ))}
        </div>
        <div className="space-y-1.5 text-sm text-text-secondary">
          <p className="font-medium text-text-primary">
            Flat tax 31,4 %&nbsp;
            <span className="font-normal text-text-secondary">
              = {(rules.flatTaxBreakdown[0].rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % d&apos;IR
              + {(rules.flatTaxBreakdown[1].rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} % de prélèvements sociaux
            </span>
          </p>
          {envelope.type === "PEA" && antiquity ? (
            <p className="text-xs">
              {antiquity.acquired
                ? "Antériorité acquise : 0 % d'IR, seuls les prélèvements sociaux (18,6 %) s'appliquent aux gains."
                : "Avant 5 ans : flat tax 31,4 %. Après 5 ans : 0 % d'IR, prélèvements sociaux 18,6 % uniquement."}
            </p>
          ) : null}
          <p className="text-xs text-text-muted">
            La flat tax de 31,4 % est la somme de l&apos;impôt sur le revenu et des prélèvements
            sociaux — pas un taux en plus de ceux-ci.
          </p>
        </div>
        <ul className="space-y-1 border-t border-border-cw/60 pt-3 text-xs text-text-muted">
          {rules.details.map((d) => (
            <li key={d}>· {d}</li>
          ))}
        </ul>
      </Card>

      {envelope.type === "PEA" ? (
        <div className="flex flex-wrap items-center gap-2">
          <DepositsBadge
            envelopeId={envelope.id}
            depositsCents={depositsCents}
            depositCapLabel={rules.depositCapLabel}
          />
          {antiquity ? (
            <Badge tone={antiquity.acquired ? "positive" : "neutral"}>
              {antiquity.acquired
                ? "Antériorité fiscale acquise ✓"
                : `Antériorité : ${antiquity.remainingLabel}`}
            </Badge>
          ) : (
            <Badge tone="neutral">Date d&apos;ouverture à renseigner pour l&apos;antériorité</Badge>
          )}
        </div>
      ) : null}

      <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Kpi
          label="Total investi"
          value={hasUnknownInvested ? `${formatEurCents(investedCents)} + ?` : formatEurCents(investedCents)}
        />
        <Kpi
          label="Valeur actuelle"
          value={formatEurCents(valueCents)}
          sub={lastValuationDate ? `Actualisée le ${lastValuationDate.toLocaleDateString("fr-FR")}` : undefined}
        />
        {gainCents !== null && gainRatio !== null ? (
          <div className="flex items-start justify-between gap-3">
            <Kpi
              label={gainCents >= 0 ? "Gain" : "Perte"}
              value={formatEurCents(Math.abs(gainCents))}
              sub={`${gainCents >= 0 ? "+" : "−"}${formatEurCents(Math.abs(gainCents))} (${(gainRatio * 100).toFixed(1).replace(".", ",")} %)`}
              subTone={gainCents >= 0 ? "positive" : "negative"}
            />
            <div className="flex gap-2"><RebuildHistoryButton envelopeId={envelope.id} /><RefreshPricesButton envelopeId={envelope.id} /></div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <Kpi
              label="Gain / perte"
              value="—"
              sub="Complétez les montants investis pour calculer le gain"
            />
            <div className="flex gap-2"><RebuildHistoryButton envelopeId={envelope.id} /><RefreshPricesButton envelopeId={envelope.id} /></div>
          </div>
        )}
      </Card>


      <Card>
        <h2 className="mb-4 font-heading text-lg font-semibold">Évolution de la valeur</h2>
        <EnvelopeChart
          valuations={valuations}
          investedCents={hasUnknownInvested ? 0 : investedCents}
          investments={investments}
          currency={user?.currency ?? "EUR"}
          numberLocale={user?.numberLocale === "en" ? "en" : "fr"}
        />
      </Card>

      <PositionsTableWithPanel
        envelopeId={envelope.id}
        etfDetails={getEtfDetailsByIsin()}
        positions={envelope.positions.map((p) => ({
          id: p.id,
          name: p.name,
          symbol: p.symbol,
          isin: isinOf(p),
          category: p.category,
          investedCents: p.investedCents,
          currentValueCents:
            p.valuations.length > 0
              ? p.valuations[p.valuations.length - 1].valueCents
              : (p.investedCents ?? null),
          boughtAt: p.boughtAt,
          valuationDate: p.valuations.length > 0 ? p.valuations[p.valuations.length - 1].date : null,
          valuationSource: p.valuations.length > 0 ? p.valuations[p.valuations.length - 1].source : null,
        }))}
      />
      <DcaSection
        envelopeId={envelope.id}
        envelopeType={envelope.type}
        plans={envelope.dcaPlans.map((plan) => ({
          id: plan.id,
          frequency: plan.frequency,
          startDate: plan.startDate,
          active: plan.active,
          lines: plan.lines.map((line) => ({
            id: line.id,
            isin: line.isin,
            name: line.name,
            maxAmountCents: line.maxAmountCents,
            active: line.active,
          })),
        }))}
        positions={envelope.positions.map((p) => ({
          symbol: p.symbol,
          quantity: p.quantity,
          unitPriceCents: p.unitPriceCents,
          valuations: p.valuations.map((v) => ({ valueCents: v.valueCents })),
        }))}
      />
      <EnvelopeDangerZone envelopeId={envelope.id} envelopeName={envelope.name} />
    </div>
  );
}
