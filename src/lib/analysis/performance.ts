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

const MS_PER_DAY = 24 * 3600 * 1000;
/** convention Excel/Sheets XIRR : Act/365, dates tronquées au jour entier */
const DAYS_PER_YEAR = 365;

/**
 * Normalise une date en minuit UTC. Les dépôts du livret sont stockés à
 * minuit local (22:00Z en heure d'été parisienne) alors que les autres flux
 * sont à minuit UTC : sans normalisation, un même jour de versement donne
 * deux exponents d'actualisation différents.
 */
export function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/**
 * Écart en jours entiers entre deux dates (convention Excel : chaque date est
 * tronquée au jour). 2025-09-25 → 2026-09-25 = 365 jours, bornes exclues.
 */
function dayDiff(from: Date, to: Date): number {
  const a = toUtcMidnight(from).getTime();
  const b = toUtcMidnight(to).getTime();
  return Math.round((b - a) / MS_PER_DAY);
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
      date: toUtcMidnight(inv.date),
      amountCents: inv.amountCents,
    }));
  }
  if (position.investedCents !== null && position.investedCents !== 0) {
    return [{ date: toUtcMidnight(position.boughtAt), amountCents: position.investedCents }];
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
 * unique triée par date, en additionnant les flux du même jour. Les dates
 * sont normalisées à minuit UTC : un dépôt livret saisi à minuit Paris
 * (22:00Z) et un versement position à minuit UTC le même jour fusionnent.
 */
export function mergeCashFlows(flows: Iterable<CashFlow>): CashFlow[] {
  const byTime = new Map<number, CashFlow>();
  for (const flow of flows) {
    const time = toUtcMidnight(flow.date).getTime();
    const existing = byTime.get(time);
    if (existing) {
      existing.amountCents += flow.amountCents;
    } else {
      byTime.set(time, {
        date: new Date(time),
        amountCents: flow.amountCents,
      });
    }
  }
  return [...byTime.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/* -------------------------------------------------------------------------- */
/*                          XIRR — rendement pondéré par l'argent              */
/* -------------------------------------------------------------------------- */

/**
 * VAN du profil « versements puis valeur finale » :
 * NPV(r) = Σ flux_i × (1+r)^((d_fin − d_i)/365) − valeur_finale.
 * Même racine que la convention Excel XIRR (Act/365, dates tronquées au
 * jour entier, premier flux non actualisé dans sa forme relative) : la
 * valeur terminale est actualisée à sa date de valorisation, pas à J+1.
 */
function npv(
  rate: number,
  flows: CashFlow[],
  finalValueCents: number,
  finalDate: Date,
): number {
  let sum = -finalValueCents;
  for (const flow of flows) {
    const years = dayDiff(flow.date, finalDate) / DAYS_PER_YEAR;
    sum += flow.amountCents * Math.pow(1 + rate, years);
  }
  return sum;
}

/**
 * Rendement annuel pondéré par l'argent (XIRR), même racine qu'Excel
 * =XIRR(flux, dates) : Act/365, dates tronquées au jour entier.
 * Résolution par bisection sur [-0.9999, 10].
 * Retourne null si non calculable (un seul flux, racine hors bornes…).
 */
export function xirr(
  flows: CashFlow[],
  finalValueCents: number,
  finalDate: Date,
): number | null {
  if (flows.length === 0 || finalValueCents <= 0) return null;
  const end = toUtcMidnight(finalDate);
  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (toUtcMidnight(sorted[0].date).getTime() >= end.getTime()) return null;
  const totalInvested = sorted.reduce((s, f) => s + f.amountCents, 0);
  if (totalInvested <= 0) return null;

  // VAN croît avec le taux pour un profil standard (versements puis valeur
  // finale) : on cherche le changement de signe par bisection.
  let low = -0.9999;
  let high = 10;
  let lowNpv = npv(low, sorted, finalValueCents, end);
  let highNpv = npv(high, sorted, finalValueCents, end);
  if (lowNpv * highNpv > 0) return null;
  for (let i = 0; i < 200; i += 1) {
    const mid = (low + high) / 2;
    const midNpv = npv(mid, sorted, finalValueCents, end);
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
/*        TWR — approximation Modified Dietz (sans valorisations)              */
/* -------------------------------------------------------------------------- */

export interface ModifiedDietzResult {
  /** rendement cumulé sur la période (fraction) */
  cumulative: number;
  /** rendement annualisé géométriquement si la période > 1 an, sinon null */
  annualized: number | null;
  /** durée de la période en années */
  years: number;
}

/**
 * Rendement pondéré par le temps approché par la méthode Modified Dietz —
 * l'approximation standard quand on n'a pas de valorisation à chaque date de
 * flux (le TWR chaîné GIPS l'exige) :
 *
 *   r = (V_fin − V_début − flux_net) / (V_début + Σ w_i × flux_i)
 *
 * avec w_i le poids temporel de chaque flux (temps de présence sur la
 * période). V_début = 0 : l'enveloppe démarre avec son premier versement.
 * Avec un flux unique, r = rendement simple exactement. Retourne null si non
 * calculable (dénominateur ≤ 0, période nulle).
 */
export function modifiedDietzReturn(
  flows: CashFlow[],
  finalValueCents: number,
  finalDate: Date,
): ModifiedDietzResult | null {
  const end = toUtcMidnight(finalDate);
  const endTime = end.getTime();
  const sorted = flows
    .filter((f) => toUtcMidnight(f.date).getTime() <= endTime)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length === 0) return null;
  const start = toUtcMidnight(sorted[0].date);
  const totalDays = dayDiff(start, end);
  if (totalDays <= 0) return null;

  const netFlow = sorted.reduce((s, f) => s + f.amountCents, 0);
  const gain = finalValueCents - netFlow;
  let denominator = 0;
  for (const flow of sorted) {
    const weight = dayDiff(flow.date, end) / totalDays;
    denominator += flow.amountCents * weight;
  }
  if (denominator <= 0) return null;

  const cumulative = gain / denominator;
  const years = totalDays / DAYS_PER_YEAR;
  const annualized =
    years > 1 && cumulative > -1 ? Math.pow(1 + cumulative, 1 / years) - 1 : null;
  return { cumulative, annualized, years };
}

/* -------------------------------------------------------------------------- */
/*                        Résultat global du module                           */
/* -------------------------------------------------------------------------- */

export interface PerformanceScope {
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
  /** TWR annualisé (Modified Dietz, fraction), null si période ≤ 1 an ou non calculable */
  twrAnnualized: number | null;
  /** TWR cumulé sur la période (Modified Dietz, fraction) */
  twrCumulative: number | null;
  /** simple : (valeur finale − versé) / versé, null si versé ≤ 0 */
  simpleReturn: number | null;
  /** gain en centimes : valeur finale − versé */
  gainCents: number | null;
  /** total versé, centimes */
  contributedCents: number;
  /** durée de la période en années, null si < 1 flux */
  years: number | null;
}

/** Nombre minimal de jours pour afficher un XIRR/TWR fiable. */
export const MIN_PERIOD_DAYS = 30;

export function computePerformanceMetrics(
  scope: PerformanceScope,
): PerformanceMetricsResult {
  const finalDate = toUtcMidnight(scope.finalDate);
  const endTime = finalDate.getTime();
  const flows = scope.flows
    .map((f) => ({ date: toUtcMidnight(f.date), amountCents: f.amountCents }))
    .filter((f) => f.date.getTime() <= endTime)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const contributedCents = flows.reduce((s, f) => s + f.amountCents, 0);
  const gainCents = scope.finalValueCents - contributedCents;
  const firstDate = flows[0]?.date ?? null;
  const days = firstDate ? dayDiff(firstDate, finalDate) : 0;
  const years = days > 0 ? days / DAYS_PER_YEAR : null;
  const simpleReturn =
    contributedCents > 0 ? gainCents / contributedCents : null;

  const enoughData = flows.length > 0 && days >= MIN_PERIOD_DAYS && scope.finalValueCents > 0;

  const xirrValue = enoughData
    ? xirr(flows, scope.finalValueCents, finalDate)
    : null;
  const dietz = enoughData
    ? modifiedDietzReturn(flows, scope.finalValueCents, finalDate)
    : null;

  return {
    xirr: xirrValue,
    twrAnnualized: dietz?.annualized ?? null,
    twrCumulative: dietz?.cumulative ?? null,
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
 * Le taux annualisé est appliqué au prorata de la durée de détention de
 * chaque versement (convention Act/365 en jours entiers, comme le XIRR).
 */
export function referenceFinalValue(
  flows: CashFlow[],
  finalDate: Date,
  rate: number,
): number {
  const end = toUtcMidnight(finalDate);
  let futureValue = 0;
  for (const flow of flows) {
    const days = dayDiff(flow.date, end);
    if (days < 0) continue;
    futureValue += flow.amountCents * Math.pow(1 + rate, days / DAYS_PER_YEAR);
  }
  return Math.round(futureValue);
}
