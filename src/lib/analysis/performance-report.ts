import {
  computePerformanceMetrics,
  envelopeCashFlows,
  mergeCashFlows,
  positionCashFlows,
  referenceFinalValue,
  type CashFlow,
  type PerformanceMetricsResult,
} from "./performance";
import type { AnalysisPosition } from "./scanners";

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
  /** flux détaillés (tableau du panneau) */
  flows: { date: Date; amountCents: number }[];
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
  /** valeur finale théorique des mêmes versements au taux livret */
  savingsReferenceValueCents: number | null;
  /** valeur finale théorique des mêmes versements au taux actions monde */
  worldReferenceValueCents: number | null;
}

/**
 * Construit un niveau de performance : valorisations (observées ou
 * interpolées depuis les flux), flux externes, métriques.
 * Sans valuations détaillées, on approxime la série : valeur nulle avant le
 * premier flux, valeur observée après le dernier flux — le XIRR reste exact
 * (il ne dépend que des flux et de la valeur finale), seul le TWR est
 * approximé (une seule sous-période par flux).
 */
export function buildLevel(params: {
  id: string;
  name: string;
  envelopeType?: AnalysisPosition["envelopeType"] | null;
  valuations: { date: Date; valueCents: number }[];
  flows: CashFlow[];
  finalValueCents: number;
  finalDate: Date;
  approximateValuations?: boolean;
}): PerformanceLevel {
  const { id, name, flows, finalValueCents, finalDate } = params;
  const envelopeType = params.envelopeType ?? null;
  let valuations = params.valuations;
  if (params.approximateValuations || valuations.length === 0) {
    // interpolation : 0 avant le premier flux, valeur finale après le dernier
    const sortedFlows = [...flows].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
    if (sortedFlows.length > 0) {
      const first = sortedFlows[0];
      const last = sortedFlows[sortedFlows.length - 1];
      valuations = [
        { date: first.date, valueCents: 0 },
        { date: last.date, valueCents: finalValueCents },
      ];
    }
  }
  const metrics = computePerformanceMetrics({
    valuations,
    flows,
    finalValueCents,
    finalDate,
  });
  return {
    id,
    name,
    envelopeType,
    metrics,
    valueCents: finalValueCents,
    contributedCents: flows.reduce((s, f) => s + f.amountCents, 0),
    flows: [...flows].sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}

/** Agrège les valorisations de plusieurs niveaux (interpolation plate). */
function aggregateValuations(
  levels: { valuations: { date: Date; valueCents: number }[] }[],
): { date: Date; valueCents: number }[] {
  const nonEmpty = levels.filter((l) => l.valuations.length > 0);
  if (nonEmpty.length === 0) return [];
  const times = [
    ...new Set(nonEmpty.flatMap((l) => l.valuations.map((v) => v.date.getTime()))),
  ].sort((a, b) => a - b);
  return times.map((time) => ({
    date: new Date(time),
    valueCents: nonEmpty.reduce((sum, level) => {
      let current = 0;
      for (const point of level.valuations) {
        if (point.date.getTime() <= time) current = point.valueCents;
        else break;
      }
      return sum + current;
    }, 0),
  }));
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
  now?: Date;
}): PerformanceReport {
  const now = params.now ?? new Date();
  const { positions, livretFlows, livretValueCents, savingsRate, worldEquityRate } =
    params;

  // --- niveaux positions -----------------------------------------------------
  const positionLevels: PerformanceLevel[] = positions
    .filter((p) => p.valueCents > 0 || (p.investedCents ?? 0) > 0)
    .map((p) =>
      buildLevel({
        id: p.id,
        name: p.name,
        envelopeType: p.envelopeType,
        valuations: p.valuations ?? [],
        flows: positionCashFlows(p),
        finalValueCents: p.valueCents,
        finalDate: now,
        approximateValuations: !(p.valuations && p.valuations.length > 1),
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
      const ownLivretFlows = livretFlows.filter(() => byEnvelope.get(envelopeId)?.type === "LIVRET_A");
      envelopeLevels.push(
        buildLevel({
          id: envelopeId,
          name: entry.name,
          envelopeType: entry.type,
          valuations: [],
          flows: ownLivretFlows.length > 0 ? ownLivretFlows : livretFlows,
          finalValueCents: livretValueCents,
          finalDate: now,
          approximateValuations: true,
        }),
      );
      continue;
    }
    const flows = mergeCashFlows(entry.positions.flatMap((p) => positionCashFlows(p)));
    const valueCents = entry.positions.reduce((s, p) => s + p.valueCents, 0);
    envelopeLevels.push(
      buildLevel({
        id: envelopeId,
        name: entry.name,
        envelopeType: entry.type,
        valuations: aggregateValuations(
          entry.positions.map((p) => ({ valuations: p.valuations ?? [] })),
        ),
        flows,
        finalValueCents: valueCents,
        finalDate: now,
        approximateValuations: entry.positions.every(
          (p) => !(p.valuations && p.valuations.length > 1),
        ),
      }),
    );
  }

  // --- niveau global ---------------------------------------------------------
  const allFlows = mergeCashFlows([
    ...envelopeCashFlows(positions),
    ...livretFlows,
  ]);
  const totalValue =
    positions.reduce((s, p) => s + p.valueCents, 0) + livretValueCents;
  const totalLevel = buildLevel({
    id: "total",
    name: "total",
    valuations: aggregateValuations([
      ...[...byEnvelope.values()]
        .filter((e) => e.type !== "LIVRET_A")
        .map((e) => ({
          valuations: aggregateValuations(
            e.positions.map((p) => ({ valuations: p.valuations ?? [] })),
          ),
        })),
      ...(livretValueCents > 0
        ? [{ valuations: [{ date: now, valueCents: livretValueCents }] }]
        : []),
    ]),
    flows: allFlows,
    finalValueCents: totalValue,
    finalDate: now,
    approximateValuations: positions.every(
      (p) => !(p.valuations && p.valuations.length > 1),
    ),
  });

  // --- références ------------------------------------------------------------
  const hasFlows = allFlows.length > 0;
  const savingsReferenceValueCents = hasFlows
    ? referenceFinalValue(allFlows, now, savingsRate)
    : null;
  const worldReferenceValueCents = hasFlows
    ? referenceFinalValue(allFlows, now, worldEquityRate)
    : null;

  return {
    total: totalLevel,
    envelopes: envelopeLevels.sort((a, b) => b.valueCents - a.valueCents),
    positions: positionLevels.sort((a, b) => b.valueCents - a.valueCents),
    savingsRate,
    worldEquityRate,
    savingsReferenceValueCents,
    worldReferenceValueCents,
  };
}
