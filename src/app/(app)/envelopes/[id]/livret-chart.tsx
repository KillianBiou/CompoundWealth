"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LIVRET_A_DEPOSIT_CAP_CENTS } from "@/lib/livret";
import { formatEurCents, formatMoneyCentsCompact } from "@/lib/money";
import { useI18n } from "@/i18n/provider";

export interface LivretPointRow {
  date: Date;
  balanceCents: number;
  overCapCents: number;
}

interface ChartPoint {
  date: number;
  /** solde crédité sur le livret (hors excédent refusé) */
  balance: number;
  /** excédent empilé au-dessus du solde (zone rouge hachurée) */
  overCapOnly: number;
  overCap: number;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  const { t } = useI18n();
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
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
        {t.envelopes.livretDca.chart.tooltipBalance}{" "}
        <span className="font-semibold text-text-primary">
          {formatEurCents(point.balance * 100)}
        </span>
      </p>
      {point.overCap > 0 ? (
        <p className="mt-1 rounded bg-negative/10 px-1.5 py-1 tabular-nums text-negative">
          {t.envelopes.livretDca.chart.tooltipOverCap.replace("{amount}", formatEurCents(point.overCap * 100))}
        </p>
      ) : null}
    </div>
  );
}

export function LivretChart({
  series,
  showCap,
  onToggleCap,
}: {
  series: LivretPointRow[];
  showCap: boolean;
  onToggleCap: () => void;
}) {
  const { t } = useI18n();
  const data = useMemo(
    () =>
      series.map((p) => ({
        date: p.date.getTime(),
        balance: p.balanceCents / 100,
        overCapOnly: p.overCapCents / 100,
        overCap: p.overCapCents / 100,
      })),
    [series],
  );

  if (series.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
        {t.envelopes.livretDca.chart.empty}
      </p>
    );
  }

  const hasOverCap = series.some((p) => p.overCapCents > 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={showCap}
            onChange={onToggleCap}
            className="h-4 w-4 cursor-pointer accent-[var(--info)]"
          />
          {t.envelopes.livretDca.chart.showCap}
        </label>
        {hasOverCap ? (
          <span className="rounded-full bg-negative/10 px-2.5 py-0.5 text-xs font-medium text-negative">
            {t.envelopes.livretDca.chart.overCapBadge}
          </span>
        ) : null}
      </div>
      <div className="h-64" aria-label={t.envelopes.livretDca.chart.aria}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="livretGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
              </linearGradient>
              <pattern
                id="overCapHatch"
                patternUnits="userSpaceOnUse"
                width="8"
                height="8"
                patternTransform="rotate(45)"
              >
                <rect width="8" height="8" fill="var(--negative)" fillOpacity={0.12} />
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--negative)" strokeWidth="2.5" />
              </pattern>
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
              domain={
                showCap
                  ? [0, (LIVRET_A_DEPOSIT_CAP_CENTS / 100) * 1.05]
                  : ["auto", "auto"]
              }
              tickFormatter={(v: number) => formatMoneyCentsCompact(v * 100)}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="stepAfter"
              dataKey="balance"
              stackId="livret"
              name={t.envelopes.livretDca.chart.balanceSeries}
              stroke="var(--info)"
              strokeWidth={2}
              fill="url(#livretGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
            />
            {hasOverCap ? (
              <Area
                type="stepAfter"
                dataKey="overCapOnly"
                stackId="livret"
                name={t.envelopes.livretDca.chart.overCapSeries}
                stroke="var(--negative)"
                strokeWidth={1.5}
                fill="url(#overCapHatch)"
                isAnimationActive
                animationDuration={400}
                connectNulls
              />
            ) : null}
            {showCap ? (
              <ReferenceLine
                y={LIVRET_A_DEPOSIT_CAP_CENTS / 100}
                stroke="var(--negative)"
                strokeDasharray="6 4"
                label={{
                  value: t.envelopes.livretDca.chart.capLabel,
                  position: "insideTopRight",
                  fill: "var(--negative)",
                  fontSize: 11,
                }}
              />
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
