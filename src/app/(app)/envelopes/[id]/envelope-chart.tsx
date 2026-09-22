"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildEnvelopeSeries,
  type PeriodKey,
  type ValuationPoint,
} from "@/lib/portfolio/series";
import { formatEurCents, formatEurCentsCompact } from "@/lib/money";
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

export function EnvelopeChart({
  valuations,
  investedCents,
}: {
  valuations: ValuationPoint[];
  investedCents: number;
}) {
  const [period, setPeriod] = useState<PeriodKey>("all");

  const data = useMemo(() => {
    const series = buildEnvelopeSeries(valuations, investedCents, null, new Date(), period);
    return series.map((p) => ({
      date: p.date.getTime(),
      dateLabel: p.date.toLocaleDateString("fr-FR"),
      value: p.valueCents / 100,
    }));
  }, [valuations, investedCents, period]);

  if (valuations.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
        Ajoutez une première valorisation pour voir la courbe.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex gap-1" role="group" aria-label="Période d'affichage">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            aria-pressed={period === p.key}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              period === p.key
                ? "bg-accent-500 text-white"
                : "bg-bg-subtle text-text-secondary hover:text-text-primary",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="h-64" aria-label="Évolution de la valeur de l'enveloppe en euros">
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
              formatter={(value) => [formatEurCents((value as number) * 100), "Valeur"]}
              labelFormatter={(label) =>
                new Date(label as number).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
            />
            {investedCents > 0 ? (
              <ReferenceLine
                y={investedCents / 100}
                stroke="var(--text-muted)"
                strokeDasharray="6 4"
                label={{
                  value: "Investi",
                  position: "insideTopLeft",
                  fill: "var(--text-muted)",
                  fontSize: 11,
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent-500)"
              strokeWidth={2}
              fill="url(#valueGradient)"
              isAnimationActive
              animationDuration={400}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="transparent"
              dot={{ r: 2.5, fill: "var(--accent-500)" }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
