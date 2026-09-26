"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEurCents } from "@/lib/money";
import type { NumberLocale } from "@/lib/money";
import type { GoalType } from "@/lib/goals/progress";
import { useI18n } from "@/i18n/provider";

export interface GoalProgressPointView {
  date: number;
  /** métrique du but : mois couverts, rente (centimes) ou fraction de la cible */
  metric: number;
  /** trajectoire théorique requise à cette date [0,1] */
  trajectory: number;
}

/** Série de progression du but : métrique par mois + trajectoire requise. */
export function GoalProgressChart({
  points,
  type,
  metricMode,
  locale,
}: {
  points: GoalProgressPointView[];
  type: GoalType;
  /** matelas : "months" (mode réserve) ou "progress" (mode montant) */
  metricMode?: "months" | "progress" | "rent";
  locale: NumberLocale;
}) {
  const { t } = useI18n();
  const effectiveMode: "months" | "progress" | "rent" =
    type === "SAFETY_NET"
      ? (metricMode ?? "months")
      : type === "FIRE"
        ? "rent"
        : "progress";
  const metricLabel =
    effectiveMode === "months"
      ? t.goals.detail.metricMonths
      : effectiveMode === "rent"
        ? t.goals.detail.metricRent
        : t.goals.detail.metricProgress;
  const isPercent = effectiveMode === "progress";

  const data = points.map((p) => ({
    date: p.date,
    metric: isPercent ? p.metric * 100 : p.metric,
    trajectory: p.trajectory * 100,
  }));

  const fmt = (v: number) =>
    isPercent
      ? `${v.toFixed(0)} %`
      : effectiveMode === "months"
        ? `${v.toFixed(1)}`
        : formatEurCents(Math.round(v));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-cw)" />
          <XAxis
            dataKey="date"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v: number) =>
              new Date(v).toLocaleDateString(locale, { month: "short", year: "2-digit" })
            }
            stroke="var(--text-muted)"
            fontSize={11}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            tickFormatter={(v: number) => (isPercent ? `${v} %` : fmt(v))}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              return (
                <div className="rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs shadow-lg">
                  <p className="font-medium text-text-primary">
                    {new Date(label as number).toLocaleDateString(locale, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  {payload.map((entry) => (
                    <p key={entry.name as string} className="text-text-secondary">
                      {entry.name === "metric" ? metricLabel : t.goals.detail.trajectoryLabel}
                      {" : "}
                      <span className="font-medium tabular-nums text-text-primary">
                        {fmt(entry.value as number)}
                      </span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-text-secondary">
                {value === "metric" ? metricLabel : t.goals.detail.trajectoryLabel}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="metric"
            name="metric"
            stroke="var(--accent-500)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="trajectory"
            name="trajectory"
            stroke="var(--text-muted)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
