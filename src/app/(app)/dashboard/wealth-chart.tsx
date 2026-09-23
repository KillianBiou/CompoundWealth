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
  periodPerformance,
  valueAt,
  type PeriodKey,
  type ValuationPoint,
} from "@/lib/portfolio/series";
import { formatEurCents, formatMoneyCentsCompact } from "@/lib/money";
import { cn } from "@/components/cn";

const periods: { key: PeriodKey; label: string }[] = [
  { key: "1m", label: "1 mois" },
  { key: "3m", label: "3 mois" },
  { key: "1y", label: "1 an" },
  { key: "all", label: "Tout" },
];

interface ChartPoint {
  date: number;
  savings: number | null;
  equity: number | null;
  invested: number | null;
}

function mergeSeries(
  savings: ValuationPoint[],
  equity: ValuationPoint[],
  investedPoints: ValuationPoint[],
): ChartPoint[] {
  const times = [
    ...new Set([
      ...savings.map((v) => v.date.getTime()),
      ...equity.map((v) => v.date.getTime()),
      ...investedPoints.map((v) => v.date.getTime()),
    ]),
  ].sort((a, b) => a - b);
  return times.map((time) => {
    const date = new Date(time);
    return {
      date: time,
      savings: savings.length > 0 ? valueAt(savings, date) / 100 : null,
      equity: equity.length > 0 ? valueAt(equity, date) / 100 : null,
      invested: investedPoints.length > 0 ? valueAt(investedPoints, date) / 100 : null,
    };
  });
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const savings = point.savings;
  const equity = point.equity;
  const invested = point.invested;
  const hasValue = savings !== null || equity !== null;
  const value = hasValue ? ((savings ?? 0) + (equity ?? 0)) * 100 : null;
  const gain = value !== null && invested !== null ? value - invested : null;
  return (
    <div className="rounded-lg border border-border-cw bg-bg-elevated p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-text-primary">
        {new Date(point.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      {savings !== null ? (
        <p className="tabular-nums text-text-secondary">
          Épargne&nbsp;:{" "}
          <span className="font-medium" style={{ color: "var(--info)" }}>
            {formatEurCents(savings * 100)}
          </span>
        </p>
      ) : null}
      {equity !== null ? (
        <p className="tabular-nums text-text-secondary">
          Actions / ETF&nbsp;:{" "}
          <span className="font-medium text-positive">{formatEurCents(equity * 100)}</span>
        </p>
      ) : null}
      {invested !== null ? (
        <p className="tabular-nums text-text-secondary">
          Investi&nbsp;:{" "}
          <span className="font-medium" style={{ color: "var(--info)" }}>
            {formatEurCents(invested * 100)}
          </span>
        </p>
      ) : null}
      {gain !== null ? (
        <p className="mt-1 border-t border-border-cw pt-1 tabular-nums">
          Plus/moins-value&nbsp;:{" "}
          <span
            className={cn("font-medium", gain >= 0 ? "text-positive" : "text-negative")}
          >
            {gain >= 0 ? "+" : "−"}
            {formatEurCents(Math.abs(gain))}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function WealthChart({
  valuations,
  investedPoints,
  savingsPoints,
  equityPoints,
}: {
  valuations: ValuationPoint[];
  investedPoints: ValuationPoint[];
  savingsPoints?: ValuationPoint[];
  equityPoints?: ValuationPoint[];
}) {
  const [period, setPeriod] = useState<PeriodKey>("all");

  const { data, changeCents, changeRatio } = useMemo(() => {
    const savings = savingsPoints ?? [];
    const equity = equityPoints ?? [];
    const series = buildEnvelopeSeries(valuations, 0, null, new Date(), period);
    const startBoundary =
      series.length > 0 ? series[0].date.getTime() : Number.NEGATIVE_INFINITY;
    const merged = mergeSeries(savings, equity, investedPoints).filter(
      (p) => p.date >= startBoundary,
    );
    const performance = periodPerformance(valuations, investedPoints, period);
    return {
      data: merged,
      changeCents: performance.gainCents,
      changeRatio: performance.ratio,
      savings,
      equity,
    };
  }, [valuations, investedPoints, savingsPoints, equityPoints, period]);

  if (valuations.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
        Ajoutez des valorisations pour voir l&apos;évolution de votre patrimoine.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Période d'affichage">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              aria-pressed={period === p.key}
              className={cn(
                "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors",
                period === p.key
                  ? "bg-accent-500 text-white"
                  : "bg-bg-subtle text-text-secondary hover:text-text-primary",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {changeCents !== null ? (
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              changeCents >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {changeCents >= 0 ? "↗" : "↘"} {formatEurCents(Math.abs(changeCents))}
            {changeRatio !== null ? (
              <span className="ml-1 font-normal text-text-secondary">
                ({changeRatio >= 0 ? "+" : "−"}
                {(Math.abs(changeRatio) * 100).toFixed(1).replace(".", ",")} % du capital investi)
              </span>
            ) : null}
            <span className="ml-1 font-normal text-text-muted">hors versements</span>
          </p>
        ) : null}
      </div>
      <div className="h-64" aria-label="Évolution du patrimoine et de l'investi">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v: number) =>
                new Date(v).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
              }
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCentsCompact(v * 100)}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
            <Area
              type="monotone"
              dataKey="savings"
              stackId="wealth"
              name="Épargne (livrets)"
              stroke="var(--info)"
              strokeWidth={2}
              fill="url(#savingsGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="equity"
              stackId="wealth"
              name="Actions / ETF"
              stroke="var(--positive)"
              strokeWidth={2}
              fill="url(#equityGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="invested"
              name="Investi (total)"
              stroke="var(--info)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
