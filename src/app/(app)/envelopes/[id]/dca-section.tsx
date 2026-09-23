import { getEtfByIsin, getEtfByTicker } from "@/lib/etf-catalog";
import {
  DCA_FREQUENCY_LABELS,
  estimateSpendCents,
  nextOccurrence,
  windowSummaries,
  type DcaFrequency,
  type DcaPricedLine,
} from "@/lib/dca";
import { formatEurCents } from "@/lib/money";
import { Badge, Card, Kpi } from "@/components/ui";
import { DcaTable, type DcaTableRow } from "./dca-table";
import { DcaCreateDialog } from "./dca-create-dialog";

export interface DcaPlanRow {
  id: string;
  frequency: DcaFrequency;
  startDate: Date;
  active: boolean;
  lines: {
    id: string;
    isin: string;
    name: string;
    maxAmountCents: number;
    active: boolean;
  }[];
}

/**
 * Prix de référence d'un titre : dernière valorisation de position / quantité,
 * sinon prix unitaire connu, sinon null (inconnu).
 */
export function referencePriceCents(
  isin: string,
  positions: { symbol: string | null; quantity: number | null; unitPriceCents: number | null; valuations: { valueCents: number }[] }[],
): number | null {
  for (const position of positions) {
    if (!position.symbol) continue;
    const catalogEntry = getEtfByTicker(position.symbol);
    if (!catalogEntry || catalogEntry.isin !== isin) continue;
    if (position.valuations.length > 0 && position.quantity && position.quantity > 0) {
      const last = position.valuations[position.valuations.length - 1].valueCents;
      const price = Math.round(last / position.quantity);
      if (price > 0) return price;
    }
    if (position.unitPriceCents && position.unitPriceCents > 0) return position.unitPriceCents;
  }
  return null;
}

export function DcaSection({
  envelopeId,
  envelopeType,
  plans,
  positions,
}: {
  envelopeId: string;
  envelopeType: "PEA" | "CTO";
  plans: DcaPlanRow[];
  positions: {
    symbol: string | null;
    quantity: number | null;
    unitPriceCents: number | null;
    valuations: { valueCents: number }[];
  }[];
}) {
  const activeLines: DcaPricedLine[] = [];
  for (const plan of plans) {
    for (const line of plan.lines) {
      activeLines.push({
        plan: { frequency: plan.frequency, startDate: plan.startDate, active: plan.active },
        line: { isin: line.isin, maxAmountCents: line.maxAmountCents, active: line.active },
        priceCents: referencePriceCents(line.isin, positions),
      });
    }
  }

  const summaries = windowSummaries(activeLines, envelopeType);
  const activeCount = activeLines.filter((l) => l.line.active && l.plan.active).length;

  const rows: DcaTableRow[] = plans.flatMap((plan) =>
    plan.lines.map((line) => {
      const etf = getEtfByIsin(line.isin);
      const priceCents = referencePriceCents(line.isin, positions);
      const estimate =
        line.active && plan.active
          ? estimateSpendCents(line.maxAmountCents, priceCents, envelopeType)
          : null;
      const next = nextOccurrence({
        frequency: plan.frequency,
        startDate: plan.startDate,
      });
      const daysUntil = Math.round(
        (new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime() -
          new Date().setHours(0, 0, 0, 0)) /
          86_400_000,
      );
      return {
        id: line.id,
        ticker: etf?.ticker ?? line.isin,
        name: etf?.name ?? line.name,
        maxAmountCents: line.maxAmountCents,
        frequencyLabel: DCA_FREQUENCY_LABELS[plan.frequency],
        nextDateLabel: next.toLocaleDateString("fr-FR"),
        nextDateRelative:
          daysUntil === 0 ? "aujourd'hui" : daysUntil === 1 ? "demain" : `dans ${daysUntil} jours`,
        estimateLabel:
          estimate && envelopeType === "PEA"
            ? `≈ ${formatEurCents(estimate.estimatedCents)} · ${estimate.quantity} part${estimate.quantity > 1 ? "s" : ""}`
            : null,
        active: line.active && plan.active,
      };
    }),
  );

  const kpiData = [
    { key: "1 mois", summary: summaries["1m"] },
    { key: "3 mois", summary: summaries["3m"] },
    { key: "1 an", summary: summaries["1y"] },
  ];

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between p-6 pb-4">
        <h2 className="font-heading text-lg font-semibold">Investissements réguliers</h2>
        <Badge tone="neutral">{activeCount}</Badge>
      </div>
      {rows.length === 0 ? (
        <p className="px-6 pb-2 text-sm text-text-secondary">
          Aucun investissement régulier pour le moment. Planifiez votre premier DCA.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 px-6 pb-4 sm:grid-cols-3">
          {kpiData.map(({ key, summary }) => (
            <Kpi
              key={key}
              label={key}
              value={formatEurCents(summary.totalEstimatedCents)}
              sub={`${formatEurCents(summary.totalMaxCents)} max · ${summary.paymentsCount} versement${summary.paymentsCount > 1 ? "s" : ""}${summary.hasUnknownPrice ? " · prix inconnu" : ""}`}
            />
          ))}
        </div>
      )}
      {rows.length > 0 ? <DcaTable envelopeId={envelopeId} rows={rows} /> : null}
      <DcaCreateDialog
        envelopeId={envelopeId}
        suggestions={buildSuggestions(positions, rows)}
      />
    </Card>
  );
}

function buildSuggestions(
  positions: { symbol: string | null }[],
  rows: DcaTableRow[],
): { isin: string; ticker: string; name: string }[] {
  const suggestions: { isin: string; ticker: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const position of positions) {
    if (!position.symbol) continue;
    const etf = getEtfByTicker(position.symbol);
    if (!etf || seen.has(etf.isin)) continue;
    seen.add(etf.isin);
    suggestions.push({ isin: etf.isin, ticker: etf.ticker, name: etf.name });
  }
  return suggestions.filter((s) => !rows.some((r) => r.name === s.name || r.ticker === s.ticker));
}
