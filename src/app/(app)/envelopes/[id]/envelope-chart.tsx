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
  buildCompoundInterestSeries,
  investedSeries,
  type CompoundInterestPoint,
  type PeriodKey,
  type ValuationPoint,
} from "@/lib/portfolio/series";
import { formatEurCentsCompact } from "@/lib/money";
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
  compound: number | null;
}

function mergeSeries(
  valuations: ValuationPoint[],
  investedPoints: ValuationPoint[],
  compound: CompoundInterestPoint[],
): ChartPoint[] {
  const times = [
    ...new Set([
      ...valuations.map((v) => v.date.getTime()),
      ...investedPoints.map((v) => v.date.getTime()),
      ...compound.map((c) => c.date.getTime()),
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
    const compoundPoint = compound.find((c) => c.date.getTime() === time);
    return {
      date: time,
      value: valueAt(valuations, time) === null ? null : valueAt(valuations, time)! / 100,
      invested: valueAt(investedPoints, time) === null ? null : valueAt(investedPoints, time)! / 100,
      compound:
        compoundPoint === undefined
          ? null
          : (compoundPoint.investedCents + compoundPoint.compoundInterestCents) / 100,
    };
  });
}

export function EnvelopeChart({
  valuations,
  investedCents,
  investments,
}: {
  valuations: ValuationPoint[];
  investedCents: number;
  investments: { date: Date; amountCents: number }[];
}) {
  const [period, setPeriod] = useState<PeriodKey>("all");

  const { data, hasCompound } = useMemo(() => {
    const investedPoints = investedSeries(investments);
    const compound = buildCompoundInterestSeries(valuations, investments);
    const merged = mergeSeries(valuations, investedPoints, compound);
    const series = buildEnvelopeSeries(
      valuations,
      investedCents,
      null,
      new Date(),
      period,
    );
    const seriesTimes = new Set(series.map((p) => p.date.getTime()));
    const startBoundary =
      series.length > 0 ? series[0].date.getTime() : Number.NEGATIVE_INFINITY;
    const filtered = merged.filter((p) => p.date >= startBoundary || seriesTimes.has(p.date));
    return { data: filtered, hasCompound: compound.length > 0 };
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
        aria-label="Évolution de la valeur de l'enveloppe en euros"
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
                new Date(v).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })
              }
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatEurCentsCompact(v * 100)}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--text-secondary)" }}
              labelFormatter={(label) =>
                new Date(label as number).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
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
            {hasCompound ? (
              <Line
                type="monotone"
                dataKey="compound"
                name="Investi + intérêts composés"
                stroke="var(--positive)"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
                connectNulls
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-text-muted">
        La courbe « Investi + intérêts composés » projette chaque versement au taux de croissance
        annualisé effectif du portefeuille ; l&apos;écart avec la courbe « Investi » est la part de
        l&apos;accroissement due aux intérêts sur intérêts.
      </p>
    </div>
  );
}
