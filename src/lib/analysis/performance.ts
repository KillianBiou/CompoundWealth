import {
  DEFAULT_EQUITY_RETURN,
  type AnalysisPosition,
} from "./scanners";

/* -------------------------------------------------------------------------- */
/*                          Flux de trésorerie externes                       */
/* -------------------------------------------------------------------------- */

export interface CashFlow {
  date: Date;
  /** centimes ; positif = entrée (dépôt), négatif = sortie (retrait) */
  amountCents: number;
}

export interface ValuationPoint {
  date: Date;
  valueCents: number;
}

/**
 * Flux externes d'une enveloppe : versements reçus, retraits (dépôts négatifs
 * du livret), valorisés à la date où l'argent entre/sort effectivement.
 * Sans historique détaillé, on retombe sur l'investi de la position daté du
 * premier achat (approximation déjà utilisée pour les séries investies).
 */
export function positionCashFlows(
  position: Pick<AnalysisPosition, "investments" | "investedCents" | "boughtAt">,
): CashFlow[] {
  if (position.investments.length > 0) {
    return position.investments.map((inv) => ({
      date: inv.date,
      amountCents: inv.amountCents,
    }));
  }
  if (position.investedCents !== null && position.investedCents !== 0) {
    return [{ date: position.boughtAt, amountCents: position.investedCents }];
  }
  return [];
}

/**
 * Dérive les flux externes des enveloppes : chaque dépôt (positions + livret)
 * est un flux à sa date réelle, les dividendes cash reçus sont des sorties
 * partielles du point de vue de la capitalisation — ils sortent du
 * portefeuille (vers le cash) et ne sont pas réinvestis ici. Pour rester
 * simple et fidèle à la valeur suivie, ils sont ignorés : la valeur
 * observée les exclut déjà (dividendes cash uniquement).
 */
export function envelopeCashFlows(positions: AnalysisPosition[]): CashFlow[] {
  return positions.flatMap((p) => positionCashFlows(p));
}

/**
 * Fusionne les flux d'investissements et les dépôts du livret en une série
 * unique triée par date, en additionnant les flux du même jour.
 */
export function mergeCashFlows(flows: Iterable<CashFlow>): CashFlow[] {
  const byTime = new Map<number, CashFlow>();
  for (const flow of flows) {
    const time = flow.date.getTime();
    const existing = byTime.get(time);
    if (existing) {
      existing.amountCents += flow.amountCents;
    } else {
      byTime.set(time, { ...flow });
    }
  }
  return [...byTime.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* -------------------------------------------------------------------------- */
/*                          XIRR — rendement pondéré par l'argent              */
/* -------------------------------------------------------------------------- */

const MS_PER_DAY = 24 * 3600 * 1000;
/** nombre de jours par an utilisé par Excel/Sheets pour XIRR (365,25 de préférence) */
const DAYS_PER_YEAR = 365;

function npv(rate: number, flows: CashFlow[], finalValueCents: number, finalTime: number): number {
  let sum = -finalValueCents;
  for (const flow of flows) {
    const years = (finalTime - flow.date.getTime()) / (MS_PER_DAY * DAYS_PER_YEAR);
    sum += flow.amountCents * Math.pow(1 + rate, years);
  }
  return sum;
}

/**
 * Rendement annuel pondéré par l'argent (XIRR) : taux r qui annule la VAN de
 * tous les flux (versements, retraits négatifs) face à la valeur finale.
 * Résolution par bisection robuste, même équation qu'Excel XIRR.
 * Retourne null si non calculable (un seul flux, racine hors bornes…).
 */
export function xirr(
  flows: CashFlow[],
  finalValueCents: number,
  finalDate: Date,
): number | null {
  if (flows.length === 0 || finalValueCents <= 0) return null;
  const finalTime = finalDate.getTime();
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted[0].date.getTime() >= finalTime) return null;
  const totalInvested = sorted.reduce((s, f) => s + f.amountCents, 0);
  if (totalInvested <= 0) return null;

  // VAN croît avec le taux pour un profil standard (versements puis valeur
  // finale) : on cherche le changement de signe par bisection sur
  // [-0.9999, 10]. Borne haute élargie pour les cas brefs.
  let low = -0.9999;
  let high = 10;
  let lowNpv = npv(low, sorted, finalValueCents, finalTime);
  let highNpv = npv(high, sorted, finalValueCents, finalTime);
  if (lowNpv * highNpv > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid, sorted, finalValueCents, finalTime);
    if (Math.abs(midNpv) < 0.005) return mid;
    if (lowNpv * midNpv <= 0) {
      high = mid;
      highNpv = midNpv;
    } else {
      low = mid;
      lowNpv = midNpv;
    }
  }
  return (low + high) / 2;
}

/* -------------------------------------------------------------------------- */
/*                          TWR — rendement pondéré par le temps               */
/* -------------------------------------------------------------------------- */

/**
 * TWR chaîné : sous-périodes délimitées par chaque flux externe, rendement
 * de chaque sous-période neutralisé des flux, puis chaînage multiplicatif.
 * Retourne le TWR cumulé sur la période (fraction), et la durée en années
 * pour annualiser si besoin.
 */
export function timeWeightedReturn(
  valuations: ValuationPoint[],
  flows: CashFlow[],
  finalValueCents: number,
  finalDate: Date,
): { cumulative: number; annualized: number | null; years: number | null } {
  if (valuations.length === 0) return { cumulative: 0, annualized: null, years: null };
  const sortedValuations = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const sortedFlows = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sortedValuations[0];
  const finalTime = finalDate.getTime();
  if (finalTime <= start.date.getTime()) {
    return { cumulative: 0, annualized: null, years: null };
  }
  // timeline : points de valorisation + dates de flux + date finale
  const times = new Set<number>(sortedValuations.map((v) => v.date.getTime()));
  for (const flow of sortedFlows) {
    if (flow.date.getTime() > start.date.getTime() && flow.date.getTime() < finalTime) {
      times.add(flow.date.getTime());
    }
  }
  times.add(finalTime);
  const sortedTimes = [...times].sort((a, b) => a - b);

  // convention : un flux à la date t est crédité à la sous-période SUIVANTE
  // (la valorisation snapshot précède les flux de même date), et la
  // valorisation initiale est post-flows (elle inclut déjà le premier achat).
  let chained = 1;
  for (let i = 1; i < sortedTimes.length; i += 1) {
    const beginTime = sortedTimes[i - 1];
    const time = sortedTimes[i];
    const flowAtBegin = i > 1 ? externalFlowAtTime(sortedFlows, beginTime) : 0;
    const beginValue = valueAtTime(sortedValuations, beginTime) + flowAtBegin;
    const endValue = time === finalTime ? finalValueCents : valueAtTime(sortedValuations, time);
    if (beginValue > 0) {
      const subReturn = (endValue - beginValue) / beginValue;
      if (subReturn > -1) {
        chained *= 1 + subReturn;
      } else {
        chained = 0;
      }
    }
  }
  const cumulative = chained - 1;
  const years = (finalTime - start.date.getTime()) / (MS_PER_DAY * DAYS_PER_YEAR);
  const annualized =
    cumulative > -1 && years > 0 ? Math.pow(1 + cumulative, 1 / years) - 1 : null;
  return { cumulative, annualized, years };
}

function valueAtTime(sortedValuations: ValuationPoint[], time: number): number {
  let current: number | null = null;
  for (const v of sortedValuations) {
    if (v.date.getTime() <= time) current = v.valueCents;
    else break;
  }
  return current ?? 0;
}

function externalFlowAtTime(sortedFlows: CashFlow[], time: number): number {
  let sum = 0;
  for (const f of sortedFlows) {
    if (f.date.getTime() === time) sum += f.amountCents;
    else if (f.date.getTime() > time) break;
  }
  return sum;
}

/* -------------------------------------------------------------------------- */
/*                        Résultat global du module                           */
/* -------------------------------------------------------------------------- */

export interface PerformanceScope {
  /** valorisations observées, triées par date */
  valuations: ValuationPoint[];
  /** flux externes : versements (positifs) et retraits (négatifs) */
  flows: CashFlow[];
  /** valeur finale en centimes */
  finalValueCents: number;
  /** date finale de l'analyse */
  finalDate: Date;
}

export interface PerformanceMetricsResult {
  /** XIRR annualisé (fraction), null si non calculable */
  xirr: number | null;
  /** TWR annualisé (fraction), null si non calculable */
  twrAnnualized: number | null;
  /** TWR cumulé sur la période (fraction) */
  twrCumulative: number | null;
  /** simple : (valeur finale − versé) / versé, null si versé ≤ 0 */
  simpleReturn: number | null;
  /** gain en centimes : valeur finale − versé */
  gainCents: number | null;
  /** total versé, centimes */
  contributedCents: number;
  /** durée de la période en années, null si < 1 point */
  years: number | null;
}

/** Nombre minimal de jours pour afficher un XIRR/TWR fiable. */
export const MIN_PERIOD_DAYS = 30;

export function computePerformanceMetrics(
  scope: PerformanceScope,
): PerformanceMetricsResult {
  const { valuations, flows, finalValueCents, finalDate } = scope;
  const contributedCents = flows.reduce((s, f) => s + f.amountCents, 0);
  const gainCents = finalValueCents - contributedCents;
  const sortedValuations = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const firstDate = sortedValuations[0]?.date ?? null;
  const lastDate =
    sortedValuations.length > 0
      ? sortedValuations[sortedValuations.length - 1].date
      : null;
  const effectiveEnd = lastDate && lastDate.getTime() > finalDate.getTime() ? lastDate : finalDate;
  const years =
    firstDate && effectiveEnd.getTime() > firstDate.getTime()
      ? (effectiveEnd.getTime() - firstDate.getTime()) / (MS_PER_DAY * DAYS_PER_YEAR)
      : null;
  const simpleReturn =
    contributedCents > 0 && gainCents !== null ? gainCents / contributedCents : null;

  const days = firstDate ? (effectiveEnd.getTime() - firstDate.getTime()) / MS_PER_DAY : 0;
  const enoughData = flows.length > 0 && days >= MIN_PERIOD_DAYS && finalValueCents > 0;

  const xirrValue = enoughData
    ? xirr(flows, finalValueCents, effectiveEnd)
    : null;
  const twr = enoughData
    ? timeWeightedReturn(valuations, flows, finalValueCents, effectiveEnd)
    : null;

  return {
    xirr: xirrValue,
    twrAnnualized: twr?.annualized ?? null,
    twrCumulative: twr?.cumulative ?? null,
    simpleReturn,
    gainCents,
    contributedCents,
    years,
  };
}

/* -------------------------------------------------------------------------- */
/*                        Références de comparaison                           */
/* -------------------------------------------------------------------------- */

/** Rendement annuel moyen long terme des actions mondiales (MSCI World ≈ 8 %/an). */
export const WORLD_EQUITY_REFERENCE_RETURN = DEFAULT_EQUITY_RETURN;

/**
 * Valeur finale théorique des mêmes versements au taux constant `rate` :
 * la référence « stratégie basique » (livret de précaution ou ETF Monde
 * au rendement historique moyen) appliquée à vos propres versements.
 */
export function referenceFinalValue(
  flows: CashFlow[],
  finalDate: Date,
  rate: number,
): number {
  let futureValue = 0;
  for (const flow of flows) {
    const years = (finalDate.getTime() - flow.date.getTime()) / (MS_PER_DAY * DAYS_PER_YEAR);
    if (years < 0) continue;
    futureValue += flow.amountCents * Math.pow(1 + rate, years);
  }
  return Math.round(futureValue);
}
