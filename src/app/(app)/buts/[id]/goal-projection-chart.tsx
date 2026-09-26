"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEurCents } from "@/lib/money";
import type { NumberLocale } from "@/lib/money";
import { useI18n } from "@/i18n/provider";

export interface GoalProjectionPointView {
  date: number;
  /** capital projeté au rendement attendu, euros */
  projected: number;
  /** trajectoire requise à cette date (capital théorique), euros */
  required: number | null;
}

/** Projection du capital jusqu'à la date cible : projeté vs trajectoire requise. */
export function GoalProjectionChart({
  points,
  locale,
}: {
  points: GoalProjectionPointView[];
  locale: NumberLocale;
}) {
  const { t } = useI18n();
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
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
            tickFormatter={(v: number) =>
              `${Math.round(v).toLocaleString(locale)} €`
            }
            width={64}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as GoalProjectionPointView;
              return (
                <div className="rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs shadow-lg">
                  <p className="font-medium text-text-primary">
                    {new Date(label as number).toLocaleDateString(locale, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-text-secondary">
                    {t.goals.detail.chartProjection}
                    {" : "}
                    <span className="font-medium tabular-nums text-text-primary">
                      {formatEurCents(Math.round(point.projected * 100))}
                    </span>
                  </p>
                  {point.required !== null ? (
                    <p className="text-text-secondary">
                      {t.goals.detail.trajectoryLabel}
                      {" : "}
                      <span className="font-medium tabular-nums text-text-primary">
                        {formatEurCents(Math.round(point.required * 100))}
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
                {value === "projected"
                  ? t.goals.detail.chartProjection
                  : t.goals.detail.trajectoryLabel}
              </span>
            )}
          />
          <Area
            dataKey="projected"
            name="projected"
            stroke="var(--accent-500)"
            fill="var(--accent-100)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            dataKey="required"
            name="required"
            stroke="var(--warning)"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            connectNulls
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
