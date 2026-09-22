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
