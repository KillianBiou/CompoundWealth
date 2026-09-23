"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildEnvelopeSeries, type PeriodKey, type ValuationPoint } from "@/lib/portfolio/series";
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
  value: number | null;
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
  if (point.value === null) return null;
  return (
    <div className="rounded-lg border border-border-cw bg-bg-elevated p-3 text-xs shadow-lg">
      <p className="mb-1 font-medium text-text-primary">
        {new Date(point.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      <p className="tabular-nums text-text-secondary">
        Patrimoine :{" "}
        <span className="font-semibold text-text-primary">
          {formatEurCents(point.value * 100)}
        </span>
      </p>
    </div>
  );
}

export function WealthChart({ valuations }: { valuations: ValuationPoint[] }) {
  const [period, setPeriod] = useState<PeriodKey>("all");

  const { data, changeCents, changeRatio } = useMemo(() => {
    const series = buildEnvelopeSeries(valuations, 0, null, new Date(), period);
    const points: ChartPoint[] = series.map((p) => ({
      date: p.date.getTime(),
      value: p.valueCents / 100,
    }));
    const first = series.length > 0 ? series[0].valueCents : null;
    const last = series.length > 0 ? series[series.length - 1].valueCents : null;
    const change = first !== null && last !== null && series.length > 1 ? last - first : null;
    const ratio = change !== null && first && first > 0 ? change / first : null;
    return { data: points, changeCents: change, changeRatio: ratio };
  }, [valuations, period]);

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
                {(Math.abs(changeRatio) * 100).toFixed(1).replace(".", ",")} %)
              </span>
            ) : null}
            <span className="ml-1 font-normal text-text-muted">sur la période</span>
          </p>
        ) : null}
      </div>
      <div className="h-64" aria-label="Évolution du patrimoine">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0} />
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
            <Area
              type="monotone"
              dataKey="value"
              name="Patrimoine"
              stroke="var(--positive)"
              strokeWidth={2}
              fill="url(#wealthGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
