"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildEnvelopeSeries,
  investedSeries,
  type PeriodKey,
  type ValuationPoint,
} from "@/lib/portfolio/series";
import { formatMoneyCents, formatMoneyCentsCompact } from "@/lib/money";
import type { NumberLocale } from "@/lib/money";
import { cn } from "@/components/ui";

const periods: { key: PeriodKey; label: string }[] = [
  { key: "1w", label: "1 sem" },
  { key: "1m", label: "1 mois" },
  { key: "3m", label: "3 mois" },
  { key: "6m", label: "6 mois" },
  { key: "1y", label: "1 an" },
  { key: "2y", label: "2 ans" },
  { key: "all", label: "Tout" },
];

interface ChartPoint {
  date: number;
  value: number | null;
  invested: number | null;
}

function mergeSeries(
  valuations: ValuationPoint[],
  investedPoints: ValuationPoint[],
): ChartPoint[] {
  const times = [
    ...new Set([
      ...valuations.map((v) => v.date.getTime()),
      ...investedPoints.map((v) => v.date.getTime()),
    ]),
  ].sort((a, b) => a - b);

  const valueAt = (points: ValuationPoint[], time: number): number | null => {
    let current: number | null = null;
    for (const p of points) {
      if (p.date.getTime() <= time) current = p.valueCents;
      else break;
    }
    return current;
  };

  return times.map((time) => {
    return {
      date: time,
      value: valueAt(valuations, time) === null ? null : valueAt(valuations, time)! / 100,
      invested: valueAt(investedPoints, time) === null ? null : valueAt(investedPoints, time)! / 100,
    };
  });
}

function ChartTooltip({
  active,
  payload,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
  currency: string;
  locale: NumberLocale;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const invested = point.invested;
  const value = point.value;

  return (
    <div
      className="rounded-lg border border-border-cw bg-bg-subtle p-3 text-xs shadow-lg"
      style={{ color: "var(--text-secondary)" }}
    >
      <p className="mb-2 font-medium text-text-primary">
        {new Date(point.date).toLocaleDateString(
          locale === "en" ? "en-US" : "fr-FR",
          { day: "numeric", month: "long", year: "numeric" },
        )}
      </p>
      {invested !== null ? (
        <p className="tabular-nums">
          Investi&nbsp;:{" "}
          <span className="font-medium text-text-primary">
            {formatMoneyCents(invested * 100, currency, locale)}
          </span>
        </p>
      ) : null}
      {invested !== null && value !== null ? (
        <p className="tabular-nums">
          Plus/moins-value&nbsp;: {" "}
          <span
            className={cn(
              "font-medium",
              value - invested >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {value - invested >= 0 ? "+" : "−"}
            {formatMoneyCents(Math.abs((value - invested) * 100), currency, locale)}
          </span>
        </p>
      ) : null}
      {value !== null ? (
        <p className="mt-1 border-t border-border-cw pt-1 tabular-nums text-text-primary">
          Valeur totale&nbsp;:{" "}
          <strong>{formatMoneyCents(value * 100, currency, locale)}</strong>
        </p>
      ) : null}
    </div>
  );
}

export function EnvelopeChart({
  valuations,
  investedCents,
  investments,
  currency = "EUR",
  numberLocale = "fr",
}: {
  valuations: ValuationPoint[];
  investedCents: number;
  investments: { date: Date; amountCents: number }[];
  currency?: string;
  numberLocale?: NumberLocale;
}) {
  const [period, setPeriod] = useState<PeriodKey>("all");

  const data = useMemo(() => {
    const investedPoints = investedSeries(investments);
    const merged = mergeSeries(valuations, investedPoints);
    const series = buildEnvelopeSeries(valuations, investedCents, null, new Date(), period);
    const startBoundary =
      series.length > 0 ? series[0].date.getTime() : Number.NEGATIVE_INFINITY;
    const filtered = merged.filter((p) => p.date >= startBoundary);
    return filtered;
  }, [valuations, investedCents, investments, period]);

  if (valuations.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
        Ajoutez une première valorisation pour voir la courbe.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-1 overflow-x-auto" role="group" aria-label="Période d'affichage">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            aria-pressed={period === p.key}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
              period === p.key
                ? "bg-accent-500 text-white"
                : "bg-bg-subtle text-text-secondary hover:text-text-primary",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div
        className="h-64"
        aria-label="Évolution de la valeur de l'enveloppe"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) =>
                new Date(v).toLocaleDateString(
                  numberLocale === "en" ? "en-US" : "fr-FR",
                  { month: "short", year: "2-digit" },
                )
              }
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCentsCompact(v * 100, currency, numberLocale)}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              content={
                <ChartTooltip currency={currency} locale={numberLocale} />
              }
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
            <Area
              type="monotone"
              dataKey="value"
              name="Valeur"
              stroke="var(--accent-500)"
              strokeWidth={2}
              fill="url(#valueGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="invested"
              name="Investi"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
