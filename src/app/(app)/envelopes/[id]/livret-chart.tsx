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

export interface LivretPointRow {
  date: Date;
  balanceCents: number;
  overCapCents: number;
}

interface ChartPoint {
  date: number;
  balance: number;
  overCap: number;
  nominalProjection?: number | null;
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
        Solde :{" "}
        <span className="font-semibold text-text-primary">
          {formatEurCents(point.balance * 100)}
        </span>
      </p>
      {point.overCap > 0 ? (
        <p className="mt-1 rounded bg-negative/10 px-1.5 py-1 tabular-nums text-negative">
          {formatEurCents(point.overCap * 100)} au-dessus du plafond — non rémunérés
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
  const data = useMemo(
    () =>
      series.map((p) => ({
        date: p.date.getTime(),
        balance: p.balanceCents / 100,
        overCap: p.overCapCents / 100,
      })),
    [series],
  );

  if (series.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
        Ajoutez un premier versement pour voir l&apos;évolution de votre livret.
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
          Montrer la limite de 22 950 €
        </label>
        {hasOverCap ? (
          <span className="rounded-full bg-negative/10 px-2.5 py-0.5 text-xs font-medium text-negative">
            ⚠ Solde au-dessus du plafond — la part excédentaire ne rapporte rien
          </span>
        ) : null}
      </div>
      <div className="h-64" aria-label="Évolution du solde du livret">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="livretGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
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
              domain={showCap ? [0, LIVRET_A_DEPOSIT_CAP_CENTS / 100 * 1.05] : ["auto", "auto"]}
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
              name="Solde"
              stroke="var(--info)"
              strokeWidth={2}
              fill="url(#livretGradient)"
              isAnimationActive
              animationDuration={400}
            />
            {showCap ? (
              <ReferenceLine
                y={LIVRET_A_DEPOSIT_CAP_CENTS / 100}
                stroke="var(--negative)"
                strokeDasharray="6 4"
                label={{
                  value: "Plafond 22 950 €",
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
