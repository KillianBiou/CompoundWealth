export interface ValuationPoint {
  date: Date;
  valueCents: number;
}

export interface SeriesPoint {
  date: Date;
  valueCents: number;
  known: boolean;
}

export type PeriodKey = "1w" | "1m" | "3m" | "6m" | "1y" | "2y" | "all";

/** durée de chaque période en jours ; null = tout l'historique */
export const PERIOD_DAYS: Record<PeriodKey, number | null> = {
  "1w": 7,
  "1m": 30,
  "3m": 91,
  "6m": 182,
  "1y": 365,
  "2y": 730,
  all: null,
};

export function buildEnvelopeSeries(
  valuations: ValuationPoint[],
  investedCents: number,
  firstInvestmentDate: Date | null,
  now: Date = new Date(),
  period: PeriodKey = "all",
): SeriesPoint[] {
  const sorted = [...valuations].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length === 0) return [];

  const days = PERIOD_DAYS[period];
  let startDate: Date | null = null;
  if (days !== null) {
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    startDate = start;
  }

  const points: SeriesPoint[] = [];
  const first = sorted[0];
  const includeFirst =
    startDate === null || first.date.getTime() >= startDate.getTime();
  if (includeFirst) {
    points.push({ date: first.date, valueCents: first.valueCents, known: true });
  } else if (startDate) {
    const anchorValue = valueAt(sorted, startDate);
    points.push({ date: startDate, valueCents: anchorValue, known: false });
  }

  for (const v of sorted.slice(1)) {
    if (startDate !== null && v.date.getTime() < startDate.getTime()) continue;
    points.push({ date: v.date, valueCents: v.valueCents, known: true });
  }
  return points;
}

export function valueAt(sorted: ValuationPoint[], date: Date): number {
  let current: number | null = null;
  for (const v of sorted) {
    if (v.date.getTime() <= date.getTime()) {
      current = v.valueCents;
    } else {
      break;
    }
  }
  // avant le premier point connu, l'enveloppe n'existait pas : 0, pas le
  // premier point (sinon un livret ouvert tard gonfle la courbe sur toute
  // l'historique alors que son investi n'a pas encore commencé)
  if (current !== null) return current;
  return 0;
}

export function currentValueCents(
  valuations: ValuationPoint[],
  investedCents: number,
): number {
  if (valuations.length === 0) return investedCents;
  const sorted = [...valuations].sort((a, b) => a.date.getTime() - b.date.getTime());
  return sorted[sorted.length - 1].valueCents;
}

export function buildEnvelopeValuations(
  positions: { valuations: ValuationPoint[] }[],
): ValuationPoint[] {
  const sortedPositions = positions.map((p) =>
    [...p.valuations].sort((a, b) => a.date.getTime() - b.date.getTime()),
  );
  const times = [
    ...new Set(
      sortedPositions.flatMap((valuations) => valuations.map((v) => v.date.getTime())),
    ),
  ].sort((a, b) => a - b);
  return times.map((t) => ({
    date: new Date(t),
    valueCents: sortedPositions.reduce((sum, valuations) => {
      let current = 0;
      for (const point of valuations) {
        if (point.date.getTime() <= t) current = point.valueCents;
        else break;
      }
      return sum + current;
    }, 0),
  }));
}

export function investedBefore(
  positions: { investedCents: number; boughtAt: Date }[],
  date: Date,
): number {
  return positions
    .filter((p) => p.boughtAt.getTime() <= date.getTime())
    .reduce((sum, p) => sum + p.investedCents, 0);
}

export interface InvestmentPoint {
  date: Date;
  amountCents: number;
}

export function investedSeries(investments: InvestmentPoint[]): ValuationPoint[] {
  const sorted = [...investments].sort((a, b) => a.date.getTime() - b.date.getTime());
  const byTime = new Map<number, number>();
  for (const inv of sorted) {
    byTime.set(inv.date.getTime(), (byTime.get(inv.date.getTime()) ?? 0) + inv.amountCents);
  }
  let cumulated = 0;
  return [...byTime.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, amountCents]) => {
      cumulated += amountCents;
      return { date: new Date(time), valueCents: cumulated };
    });
}



/**
 * Agrège les séries de valorisation de plusieurs enveloppes en une série
 * patrimoine unique : la valeur à chaque instant t est la somme des dernières
 * valeurs connues de chaque enveloppe (interpolation plate).
 */
export function aggregateSeries(
  seriesList: ValuationPoint[][],
): ValuationPoint[] {
  const nonEmpty = seriesList.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return [];
  const times = [
    ...new Set(
      nonEmpty.flatMap((series) => series.map((point) => point.date.getTime())),
    ),
  ].sort((a, b) => a - b);
  return times.map((time) => ({
    date: new Date(time),
    valueCents: nonEmpty.reduce((sum, series) => {
      let current = 0;
      for (const point of series) {
        if (point.date.getTime() <= time) current = point.valueCents;
        else break;
      }
      return sum + current;
    }, 0),
  }));
}

/**
 * Série cumulée des sommes investies pour une enveloppe : utilise l'historique
 * détaillé des versements quand il existe (import bancaire), sinon le montant
 * investi de la position à sa date d'achat.
 */
export function buildEnvelopeInvestedSeries(
  positions: {
    investedCents: number | null;
    boughtAt: Date;
    investments: { date: Date; amountCents: number }[];
  }[],
): ValuationPoint[] {
  const points: { date: Date; amountCents: number }[] = [];
  for (const position of positions) {
    if (position.investments.length > 0) {
      for (const investment of position.investments) {
        points.push({ date: investment.date, amountCents: investment.amountCents });
      }
    } else if (position.investedCents !== null && position.investedCents > 0) {
      points.push({ date: position.boughtAt, amountCents: position.investedCents });
    }
  }
  return investedSeries(points);
}

export interface PeriodPerformanceResult {
  /** gain réel sur la période : variation de valeur moins les versements de la période */
  gainCents: number | null;
  /** gain rapporté au capital moyen présent sur la période (Modified Dietz) */
  ratio: number | null;
}

/**
 * Performance d'une période par rapport au capital investi, et non à la
 * première valeur de la courbe (qui démarre près de zéro et gonfle le %).
 * Pour « tout l'historique » : gain = valeur actuelle − total investi,
 * rapporté au total investi.
 * Pour une sous-période : gain = Δvaleur − Δinvesti (les versements de la
 * période sont exclus), rapporté au capital moyen présent durant la
 * période — l'investi de début plus chaque versement pondéré par son temps
 * de présence (Modified Dietz). L'investi de début seul gonfle artificiel-
 * lement le % quand le portefeuille était tout petit un an plus tôt.
 */
export function periodPerformance(
  valuations: ValuationPoint[],
  invested: ValuationPoint[],
  period: PeriodKey,
  now: Date = new Date(),
): PeriodPerformanceResult {
  const sortedValuations = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  if (sortedValuations.length === 0) return { gainCents: null, ratio: null };
  const sortedInvested = [...invested].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const valueEnd = sortedValuations[sortedValuations.length - 1].valueCents;

  if (sortedInvested.length === 0) {
    const first = sortedValuations[0].valueCents;
    const gainCents = sortedValuations.length > 1 ? valueEnd - first : null;
    return {
      gainCents,
      ratio: gainCents !== null && first > 0 ? gainCents / first : null,
    };
  }

  const investedEnd = sortedInvested[sortedInvested.length - 1].valueCents;
  const days = PERIOD_DAYS[period];
  if (days === null) {
    const gainCents = valueEnd - investedEnd;
    return {
      gainCents,
      ratio: investedEnd > 0 ? gainCents / investedEnd : null,
    };
  }

  const endTime = now.getTime();
  const cutoffTime = endTime - days * 24 * 60 * 60 * 1000;
  const lastValuationBefore = sortedValuations.findLast(
    (v) => v.date.getTime() <= cutoffTime,
  );
  const valueStart = lastValuationBefore ? lastValuationBefore.valueCents : 0;
  const lastInvestedBefore = sortedInvested.findLast(
    (v) => v.date.getTime() <= cutoffTime,
  );
  const investedStart = lastInvestedBefore ? lastInvestedBefore.valueCents : 0;

  // versements de la période, pondérés par leur temps de présence (Modified Dietz)
  let weightedFlows = 0;
  const windowMs = Math.max(1, endTime - cutoffTime);
  for (let i = 0; i < sortedInvested.length; i++) {
    const time = sortedInvested[i].date.getTime();
    if (time <= cutoffTime) continue;
    if (time > endTime) break;
    const previous = i > 0 ? sortedInvested[i - 1].valueCents : 0;
    const weight = Math.min(1, Math.max(0, (endTime - time) / windowMs));
    weightedFlows += (sortedInvested[i].valueCents - previous) * weight;
  }

  const gainCents = valueEnd - valueStart - (investedEnd - investedStart);
  const denominator = investedStart + weightedFlows;
  return {
    gainCents,
    ratio:
      denominator > 0
        ? gainCents / denominator
        : investedEnd > 0
          ? gainCents / investedEnd
          : null,
  };
}
