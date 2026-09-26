"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
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
  /** projection future de la métrique (DCA + rendement attendu), même unité ; null = réel */
  projected?: number | null;
}

/** Série de progression du but : réel (corail) + projection dorée jusqu'au but atteint. */
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
    projected: p.projected !== undefined && p.projected !== null
      ? (isPercent ? p.projected * 100 : p.projected)
      : null,
    trajectory: p.trajectory * 100,
  }));

  // point de jonction réel → projection (dernier point réel, à aujourd'hui)
  const lastReal = [...points].reverse().find((p) => p.projected === undefined || p.projected === null);
  const joinPoint = lastReal
    ? {
        date: lastReal.date,
        value: isPercent ? lastReal.metric * 100 : lastReal.metric,
      }
    : null;
  // point d'atteinte du but (fin de projection)
  const reachPoint = (() => {
    const last = points[points.length - 1];
    if (!last || last.projected === undefined || last.projected === null) return null;
    return {
      date: last.date,
      value: isPercent ? last.projected * 100 : last.projected,
    };
  })();

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
              const point = payload[0].payload as {
                metric: number;
                projected: number | null;
                trajectory: number;
              };
              const value = point.projected !== null ? point.projected : point.metric;
              const isProjected = point.projected !== null && point.metric === null;
              return (
                <div className="rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs shadow-lg">
                  <p className="font-medium text-text-primary">
                    {new Date(label as number).toLocaleDateString(locale, {
                      month: "long",
                      year: "numeric",
                    })}
                    {isProjected ? ` · ${t.goals.detail.projectionLabel}` : ""}
                  </p>
                  <p className="text-text-secondary">
                    {metricLabel} :{" "}
                    <span
                      className={
                        isProjected
                          ? "font-medium tabular-nums text-[var(--gold)]"
                          : "font-medium tabular-nums text-text-primary"
                      }
                    >
                      {fmt(value)}
                    </span>
                  </p>
                  <p className="text-text-secondary">
                    {t.goals.detail.trajectoryLabel} :{" "}
                    <span className="font-medium tabular-nums text-text-primary">
                      {isPercent ? `${point.trajectory.toFixed(0)} %` : fmt(point.trajectory)}
                    </span>
                  </p>
                </div>
              );
            }}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-text-secondary">
                {value === "metric"
                  ? metricLabel
                  : value === "projected"
                    ? t.goals.detail.projectionLabel
                    : t.goals.detail.trajectoryLabel}
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
            connectNulls
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            name="projected"
            stroke="var(--gold)"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            connectNulls
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
          {reachPoint ? (
            <ReferenceDot
              x={reachPoint.date}
              y={reachPoint.value}
              r={5}
              fill="var(--gold)"
              stroke="var(--bg-elevated)"
              strokeWidth={2}
            />
          ) : null}
          {joinPoint ? (
            <ReferenceDot
              x={joinPoint.date}
              y={joinPoint.value}
              r={3}
              fill="var(--accent-500)"
              stroke="var(--bg-elevated)"
              strokeWidth={2}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
