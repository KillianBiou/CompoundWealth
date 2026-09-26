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

export interface GoalValuePointView {
  date: number;
  /** valeur agrégée des enveloppes liées, euros */
  value: number;
  /** investi cumulé, euros */
  invested: number | null;
}

/** Valeur des enveloppes liées au but : pattern wealth-chart (aire + investi cumulé). */
export function GoalValueChart({
  points,
  locale,
}: {
  points: GoalValuePointView[];
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
              const point = payload[0].payload as GoalValuePointView;
              return (
                <div className="rounded-md border border-border-cw bg-bg-elevated p-2.5 text-xs shadow-lg">
                  <p className="font-medium text-text-primary">
                    {new Date(label as number).toLocaleDateString(locale, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-text-secondary">
                    {t.goals.detail.valueLabel}
                    {" : "}
                    <span className="font-medium tabular-nums text-text-primary">
                      {formatEurCents(Math.round(point.value * 100))}
                    </span>
                  </p>
                  {point.invested !== null ? (
                    <p className="text-text-secondary">
                      {t.goals.detail.investedLabel}
                      {" : "}
                      <span className="font-medium tabular-nums text-text-primary">
                        {formatEurCents(Math.round(point.invested * 100))}
                      </span>
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
          <Area
            dataKey="value"
            stroke="var(--accent-500)"
            fill="var(--accent-100)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            dataKey="invested"
            stroke="var(--text-muted)"
            fill="none"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            connectNulls
            isAnimationActive={false}
          />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-text-secondary">
                {value === "value"
                  ? t.goals.detail.valueLabel
                  : t.goals.detail.investedLabel}
              </span>
            )}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
