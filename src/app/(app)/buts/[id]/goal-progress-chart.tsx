"use client";

import { useState } from "react";
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
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

export interface GoalProgressPointView {
  date: number;
  /** métrique du but : mois couverts, rente (centimes) ou fraction de la cible */
  metric: number;
  /** trajectoire théorique requise à cette date [0,1] */
  trajectory: number;
  /** valeur agrégée des enveloppes liées, centimes (mode capital) */
  valueCents?: number | null;
  /** capital cible, centimes (ligne de référence du mode capital) */
  targetCents?: number | null;
  /** projection future de la métrique (DCA + rendement attendu), même unité ; null = réel */
  projected?: number | null;
  /** projection future de la valeur, centimes */
  projectedValueCents?: number | null;
}

/** Sélecteur de vue du graphique d'évolution du but. */
function ChartModeToggle({
  mode,
  onChange,
  labels,
}: {
  mode: "metric" | "capital";
  onChange: (m: "metric" | "capital") => void;
  labels: { metric: string; capital: string };
}) {
  return (
    <div className="inline-flex rounded-lg border border-border-cw bg-bg-subtle p-0.5">
      {(["metric", "capital"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            mode === m
              ? "bg-bg-elevated text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary",
          )}
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}

/** Série de progression du but : réel (corail) + projection dorée jusqu'au but atteint. */
export function GoalProgressChart({
  points,
  metricMode,
  locale,
  capitalAvailable,
  labels,
}: {
  points: GoalProgressPointView[];
  /** matelas : "months" (mode réserve) ou "progress" (mode montant) */
  metricMode?: "months" | "progress" | "rent";
  locale: NumberLocale;
  /** le mode capital n'est proposé que si les données de valeur existent */
  capitalAvailable?: boolean;
  labels?: { metric?: string; capital?: string } | null;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"metric" | "capital">("metric");
  const effectiveMode: "months" | "progress" | "rent" = metricMode ?? "progress";
  const metricLabel =
    effectiveMode === "months"
      ? t.goals.detail.metricMonths
      : effectiveMode === "rent"
        ? t.goals.detail.metricRent
        : t.goals.detail.metricProgress;
  const isPercent = mode === "metric" && effectiveMode === "progress";
  const showCapital = mode === "capital" && capitalAvailable;
  const capitalLabel = labels?.capital ?? t.goals.detail.capitalLabel;

  const data = points.map((p) => ({
    date: p.date,
    metric: isPercent ? p.metric * 100 : p.metric,
    value: showCapital ? (p.valueCents ?? 0) / 100 : null,
    projected:
      mode === "metric" && p.projected !== undefined && p.projected !== null
        ? (isPercent ? p.projected * 100 : p.projected)
        : null,
    projectedValue: showCapital && p.projectedValueCents != null
      ? p.projectedValueCents / 100
      : null,
    trajectory: p.trajectory * 100,
  }));

  const fmtMetric = (v: number) =>
    isPercent
      ? `${v.toFixed(0)} %`
      : effectiveMode === "months"
        ? `${v.toFixed(1)}`
        : formatEurCents(Math.round(v));

  // point de jonction réel → projection (dernier point réel, à aujourd'hui)
  const lastReal = [...points].reverse().find(
    (p) => p.projected === undefined || p.projected === null,
  );
  const joinPoint = lastReal
    ? {
        date: lastReal.date,
        value: showCapital
          ? ((lastReal.valueCents ?? 0) / 100)
          : isPercent
            ? lastReal.metric * 100
            : lastReal.metric,
      }
    : null;
  // point d'atteinte du but (fin de projection)
  const reachPoint = (() => {
    const last = points[points.length - 1];
    if (!last) return null;
    if (showCapital) {
      if (last.projectedValueCents == null) return null;
      return { date: last.date, value: last.projectedValueCents / 100 };
    }
    if (last.projected === undefined || last.projected === null) return null;
    return {
      date: last.date,
      value: isPercent ? last.projected * 100 : last.projected,
    };
  })();

  const fmt = (v: number) =>
    showCapital
      ? formatEurCents(Math.round(v * 100))
      : fmtMetric(v);

  const activeKey = showCapital
    ? "projectedValue"
    : "projected";
  const mainKey = showCapital ? "value" : "metric";

  return (
    <div className="space-y-3">
      {capitalAvailable ? (
        <div className="flex items-center justify-end">
          <ChartModeToggle
            mode={mode}
            onChange={setMode}
            labels={{
              metric: labels?.metric ?? metricLabel,
              capital: capitalLabel,
            }}
          />
        </div>
      ) : null}
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
              tickFormatter={(v: number) => (showCapital ? formatEurCents(Math.round(v * 100)).replace(/\s€/, " €") : isPercent ? `${v} %` : fmtMetric(v))}
              width={showCapital ? 72 : 48}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                const point = payload[0].payload as {
                  metric: number;
                  value: number | null;
                  projected: number | null;
                  projectedValue: number | null;
                  trajectory: number;
                };
                const projectedVal = showCapital ? point.projectedValue : point.projected;
                const mainVal = showCapital ? point.value : point.metric;
                const value = projectedVal !== null ? projectedVal : (mainVal ?? 0);
                const isProjected = projectedVal !== null && mainVal === null;
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
                      {showCapital ? capitalLabel : metricLabel} :{" "}
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
                    {!showCapital ? (
                      <p className="text-text-secondary">
                        {t.goals.detail.trajectoryLabel} :{" "}
                        <span className="font-medium tabular-nums text-text-primary">
                          {isPercent ? `${point.trajectory.toFixed(0)} %` : fmtMetric(point.trajectory)}
                        </span>
                      </p>
                    ) : null}
                  </div>
                );
              }}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-text-secondary">
                  {value === mainKey
                    ? showCapital
                      ? capitalLabel
                      : metricLabel
                    : value === activeKey
                      ? t.goals.detail.projectionLabel
                      : t.goals.detail.trajectoryLabel}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey={mainKey}
              name={mainKey}
              stroke="var(--accent-500)"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey={activeKey}
              name={activeKey}
              stroke="var(--gold)"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {!showCapital ? (
              <Line
                type="monotone"
                dataKey="trajectory"
                name="trajectory"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ) : null}
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
    </div>
  );
}
