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
  if (current !== null) return current;
  const hasEarlier = sorted.some((v) => v.date.getTime() <= date.getTime());
  if (hasEarlier && current !== null) return current;
  const firstPoint = sorted[0];
  return firstPoint ? firstPoint.valueCents : 0;
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

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;

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
 * Taux de croissance annualisé effectif du portefeuille (approximation du TRI
 * pondéré par les dates de versement), en cherche le taux r tel que la
 * croissance composée de chaque versement reproduise la valeur finale.
 */
export function annualizedGrowthRate(
  investments: InvestmentPoint[],
  finalValueCents: number,
  finalDate: Date,
): number | null {
  if (investments.length === 0 || finalValueCents <= 0) return null;
  const totalInvested = investments.reduce((s, i) => s + i.amountCents, 0);
  if (totalInvested <= 0) return null;

  const yearsOf = (date: Date) =>
    Math.max(0, (finalDate.getTime() - date.getTime()) / MS_PER_YEAR);

  let low = -0.99;
  let high = 10;
  for (let iter = 0; iter < 100; iter += 1) {
    const r = (low + high) / 2;
    const projected = investments.reduce(
      (sum, inv) => sum + inv.amountCents * Math.pow(1 + r, yearsOf(inv.date)),
      0,
    );
    if (projected > finalValueCents) high = r;
    else low = r;
  }
  return (low + high) / 2;
}

export interface CompoundInterestPoint {
  date: Date;
  /** valeur réelle du portefeuille */
  valueCents: number;
  /** total investi cumulé à cette date */
  investedCents: number;
  /** intérêts composés cumulés : Σ versement × ((1+r)^t − 1), toujours ≥ 0 */
  compoundInterestCents: number;
  /** part de la croissance due aux intérêts sur intérêts (effet boule de neige), toujours ≥ 0 */
  interestOnInterestCents: number;
}

/**
 * Intérêts composés générés à chaque date au taux de croissance annualisé
 * effectif r : chaque versement P rapporte P × ((1+r)^t − 1), la formule usuelle
 * des intérêts composés, positive dès que r > 0 quelle que soit la durée.
 *
 * La part « intérêts sur intérêts » isole l'effet boule de neige : la croissance
 * composée e^(ρt) est comparée à la croissance simple au taux continu
 * équivalent ρ = ln(1+r). Comme e^x ≥ 1 + x pour tout x ≥ 0, la part
 * e^(ρt) − 1 − ρt est positive à toute échéance, même sous un an (comparer au
 * taux nominal donnerait une part négative sous l'unité de temps, car
 * (1+r)^t < 1 + r·t lorsque t < 1).
 */
export function buildCompoundInterestSeries(
  valuations: ValuationPoint[],
  investments: InvestmentPoint[],
): CompoundInterestPoint[] {
  if (valuations.length === 0 || investments.length === 0) return [];
  const sortedValuations = [...valuations].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const finalValue = sortedValuations[sortedValuations.length - 1].valueCents;
  const finalDate = sortedValuations[sortedValuations.length - 1].date;
  const rate = annualizedGrowthRate(investments, finalValue, finalDate);
  if (rate === null || !Number.isFinite(rate) || rate <= 0) return [];
  const continuousRate = Math.log(1 + rate);

  return sortedValuations.map((v) => {
    const active = investments.filter((i) => i.date.getTime() <= v.date.getTime());
    const investedUpTo = active.reduce((sum, i) => sum + i.amountCents, 0);
    const elapsedYears = (i: InvestmentPoint) =>
      Math.max(0, (v.date.getTime() - i.date.getTime()) / MS_PER_YEAR);
    const compoundInterest = active.reduce(
      (sum, i) => sum + i.amountCents * (Math.pow(1 + rate, elapsedYears(i)) - 1),
      0,
    );
    const interestOnInterest = active.reduce(
      (sum, i) =>
        sum +
        i.amountCents *
          (Math.pow(1 + rate, elapsedYears(i)) - 1 - continuousRate * elapsedYears(i)),
      0,
    );
    return {
      date: v.date,
      valueCents: v.valueCents,
      investedCents: investedUpTo,
      compoundInterestCents: Math.round(compoundInterest),
      interestOnInterestCents: Math.round(interestOnInterest),
    };
  });
}
