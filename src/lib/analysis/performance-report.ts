import {
  computePerformanceMetrics,
  envelopeCashFlows,
  mergeCashFlows,
  positionCashFlows,
  referenceFinalValue,
  toUtcMidnight,
  type CashFlow,
  type PerformanceMetricsResult,
} from "./performance";
import { buildEnvelopeValuations, valueAt } from "@/lib/portfolio/series";
import type { AnalysisPosition } from "./scanners";
import type { PerformancePeriodKey } from "./performance-periods";

export type { PerformancePeriodKey } from "./performance-periods";

/* -------------------------------------------------------------------------- */
/*                     Rapport de performance par niveau                       */
/* -------------------------------------------------------------------------- */

export interface PerformanceLevel {
  /** identifiant (envelopeId ou positionId) */
  id: string;
  /** nom affiché */
  name: string;
  /** type d'enveloppe pour le niveau enveloppe, sinon null */
  envelopeType: AnalysisPosition["envelopeType"] | null;
  /** métriques du niveau, null si non calculable */
  metrics: PerformanceMetricsResult | null;
  /** valeur finale, centimes */
  valueCents: number;
  /** total versé, centimes */
  contributedCents: number;
  /** valeur du niveau au début de la sous-période, centimes (0 sur toute la vie) */
  startValueCents: number;
  /** flux détaillés (tableau du panneau) */
  flows: { date: Date; amountCents: number }[];
}

export interface ReferenceStrategy {
  /** taux annualisé de la référence (fraction) */
  rate: number;
  /** valeur finale théorique des mêmes versements au taux, centimes */
  valueCents: number;
  /** vrai gain de la référence : valeur théorique − versé, centimes */
  gainCents: number;
  /** écart du portefeuille réel vs la référence (valeur réelle − valeur théorique), centimes */
  deltaCents: number;
}

export interface PerformanceReport {
  /** performance globale (toutes enveloppes, y compris livret) */
  total: PerformanceLevel;
  /** performance par enveloppe */
  envelopes: PerformanceLevel[];
  /** performance par position (actif) */
  positions: PerformanceLevel[];
  /** taux de référence de l'épargne de précaution (livret), fraction */
  savingsRate: number;
  /** rendement de référence historique des actions mondiales, fraction */
  worldEquityRate: number;
  /** référence « mêmes versements au taux livret » avec gains et écart */
  savingsReference: ReferenceStrategy | null;
  /** référence « mêmes versements au taux actions monde » avec gains et écart */
  worldReference: ReferenceStrategy | null;
  /** croissance réelle du MSCI World sur la même période (via Yahoo), null si indisponible */
  worldGrowth: {
    /** TWR du MSCI World sur la période (fraction) */
    cumulative: number;
    /** annualisé si période > 1 an, sinon null */
    annualized: number | null;
    /** premier point de cours utilisé (Date ISO) */
    startDate: Date;
    /** dernier point de cours utilisé (Date ISO) */
    endDate: Date;
    /** valeur finale théorique des mêmes versements placés sur le MSCI World réel (la marche d'escalier DCA au cours réel), centimes */
    referenceValueCents: number;
    /** écart du portefeuille réel vs cette marche d'escalier World réelle, centimes */
    deltaCents: number;
  } | null;
  /** clé de la période analysée ("1y", "3y", "5y", "all") */
  period: PerformancePeriodKey;
  /** date de début effective de la période analysée (premier flux ou cutoff), null = toute la vie */
  periodStart: Date | null;
}

/**
 * Construit un niveau de performance : flux externes normalisés (UTC minuit),
 * métriques XIRR / Modified Dietz sur les seuls flux et la valeur finale.
 * Sans valorisations intermédiaires, le TWR chaîné GIPS est impossible —
 * le Modified Dietz en est l'approximation standard, le XIRR reste exact.
 */
export function buildLevel(params: {
  id: string;
  name: string;
  envelopeType?: AnalysisPosition["envelopeType"] | null;
  flows: CashFlow[];
  finalValueCents: number;
  finalDate: Date;
  /** début de la sous-période (null = toute la vie du niveau) */
  startDate?: Date | null;
  /** valeur du niveau au début de la sous-période, centimes */
  startValueCents?: number;
}): PerformanceLevel {
  const { id, name, flows, finalValueCents, finalDate } = params;
  const envelopeType = params.envelopeType ?? null;
  const normalized = mergeCashFlows(
    flows.map((f) => ({ date: toUtcMidnight(f.date), amountCents: f.amountCents })),
  );
  const metrics = computePerformanceMetrics({
    flows: normalized,
    finalValueCents,
    finalDate,
    startDate: params.startDate ?? null,
    startValueCents: params.startValueCents ?? 0,
  });
  const hasSubPeriod = params.startDate != null;
  const periodFlows = hasSubPeriod
    ? normalized.filter(
        (f) => f.date.getTime() > toUtcMidnight(params.startDate!).getTime(),
      )
    : normalized;
  return {
    id,
    name,
    envelopeType,
    metrics,
    valueCents: finalValueCents,
    contributedCents: periodFlows.reduce((s, f) => s + f.amountCents, 0),
    startValueCents: params.startValueCents ?? 0,
    flows: periodFlows,
  };
}

function buildReference(
  flows: CashFlow[],
  finalDate: Date,
  rate: number,
  portfolioValueCents: number,
  startValueCents = 0,
  startDate?: Date | null,
): ReferenceStrategy {
  const valueCents = referenceFinalValue(
    flows,
    finalDate,
    rate,
    startValueCents,
    startDate,
  );
  const contributed =
    flows.reduce((s, f) => s + f.amountCents, 0) +
    (startDate != null ? Math.max(0, startValueCents) : 0);
  return {
    rate,
    valueCents,
    gainCents: valueCents - contributed,
    deltaCents: portfolioValueCents - valueCents,
  };
}

export function buildPerformanceReport(params: {
  positions: AnalysisPosition[];
  /** flux des dépôts du livret (les dépôts livret ne sont pas des positions) */
  livretFlows: CashFlow[];
  /** solde actuel du livret, centimes */
  livretValueCents: number;
  /** taux du livret (fraction) */
  savingsRate: number;
  /** rendement historique actions monde (fraction) */
  worldEquityRate: number;
  /** croissance réelle du MSCI World sur la même période, si disponible */
  worldGrowth?: PerformanceReport["worldGrowth"];
  /** clé de la période analysée ("1y", "3y", "5y", "all") */
  period?: PerformancePeriodKey;
  /** cutoff de la sous-période (null = toute la vie du portefeuille) */
  periodStart?: Date | null;
  /** valeur du livret au cutoff de la sous-période, centimes */
  livretStartValueCents?: number;
  now?: Date;
}): PerformanceReport {
  const now = params.now ?? new Date();
  const { positions, livretFlows, livretValueCents, savingsRate, worldEquityRate } =
    params;
  const period = params.period ?? "all";
  const periodStart =
    params.periodStart != null ? toUtcMidnight(params.periodStart) : null;
  const livretStartValueCents = params.livretStartValueCents ?? 0;
  const isSubPeriod = periodStart !== null;

  /** valeur d'un niveau au cutoff : dernière valorisation connue avant la date */
  const startValueOf = (valuations: { date: Date; valueCents: number }[]) =>
    periodStart !== null ? valueAt(valuations, periodStart) : 0;
  /** flux d'un niveau restreints à la sous-période (après le cutoff) */
  const inPeriod = (flows: CashFlow[]) =>
    periodStart !== null
      ? flows.filter((f) => toUtcMidnight(f.date).getTime() > periodStart.getTime())
      : flows;

  // --- niveaux positions -----------------------------------------------------
  const positionLevels: PerformanceLevel[] = positions
    .filter(
      (p) =>
        p.valueCents > 0 ||
        (p.investedCents ?? 0) > 0 ||
        (isSubPeriod && startValueOf(p.valuations ?? []) > 0),
    )
    .map((p) =>
      buildLevel({
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType,
        flows: positionCashFlows(p),
        finalValueCents: p.valueCents,
        finalDate: now,
        startDate: periodStart,
        startValueCents: startValueOf(p.valuations ?? []),
      }),
    );

  // --- niveaux enveloppes ---------------------------------------------------
  const byEnvelope = new Map<
    string,
    { name: string; type: AnalysisPosition["envelopeType"]; positions: AnalysisPosition[] }
  >();
  for (const p of positions) {
    const entry = byEnvelope.get(p.envelopeId) ?? {
      name: p.envelopeName,
      type: p.envelopeType,
      positions: [],
    };
    entry.positions.push(p);
    byEnvelope.set(p.envelopeId, entry);
  }
  const envelopeLevels: PerformanceLevel[] = [];
  for (const [envelopeId, entry] of byEnvelope) {
    if (entry.type === "LIVRET_A") {
      // le livret : flux des dépôts, valeur = solde du livret
      envelopeLevels.push(
        buildLevel({
          id: envelopeId,
          name: entry.name,
          envelopeType: entry.type,
          flows: livretFlows.map((f) => ({
            date: toUtcMidnight(f.date),
            amountCents: f.amountCents,
          })),
          finalValueCents: livretValueCents,
          finalDate: now,
          startDate: periodStart,
          startValueCents: livretStartValueCents,
        }),
      );
      continue;
    }
    const flows = mergeCashFlows(entry.positions.flatMap((p) => positionCashFlows(p)));
    const valueCents = entry.positions.reduce((s, p) => s + p.valueCents, 0);
    // valorisations agrégées de l'enveloppe : somme des dernières valeurs
    // connues de chaque position à chaque instant (interpolation plate)
    const envelopeValuations = buildEnvelopeValuations(
      entry.positions.map((p) => ({ valuations: p.valuations ?? [] })),
    );
    envelopeLevels.push(
      buildLevel({
        id: envelopeId,
        name: entry.name,
        envelopeType: entry.type,
        flows,
        finalValueCents: valueCents,
        finalDate: now,
        startDate: periodStart,
        startValueCents: startValueOf(envelopeValuations),
      }),
    );
  }

  // --- niveau global ---------------------------------------------------------
  const allFlows = mergeCashFlows([
    ...envelopeCashFlows(positions),
    ...livretFlows.map((f) => ({
      date: toUtcMidnight(f.date),
      amountCents: f.amountCents,
    })),
  ]);
  const totalValue =
    positions.reduce((s, p) => s + p.valueCents, 0) + livretValueCents;
  const totalStartValueCents =
    positions.reduce((s, p) => s + startValueOf(p.valuations ?? []), 0) +
    livretStartValueCents;
  const totalLevel = buildLevel({
    id: "total",
    name: "total",
    flows: allFlows,
    finalValueCents: totalValue,
    finalDate: now,
    startDate: periodStart,
    startValueCents: totalStartValueCents,
  });

  // --- références ------------------------------------------------------------
  const hasFlows = allFlows.length > 0 || totalStartValueCents > 0;
  const periodFlows = inPeriod(allFlows);
  const savingsReference = hasFlows
    ? buildReference(
        periodFlows,
        now,
        savingsRate,
        totalValue,
        totalStartValueCents,
        periodStart,
      )
    : null;
  const worldReference = hasFlows
    ? buildReference(
        periodFlows,
        now,
        worldEquityRate,
        totalValue,
        totalStartValueCents,
        periodStart,
      )
    : null;

  return {
    total: totalLevel,
    envelopes: envelopeLevels.sort((a, b) => b.valueCents - a.valueCents),
    positions: positionLevels.sort((a, b) => b.valueCents - a.valueCents),
    savingsRate,
    worldEquityRate,
    savingsReference,
    worldReference,
    worldGrowth: params.worldGrowth ?? null,
    period,
    periodStart,
  };
}
