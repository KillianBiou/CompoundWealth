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
  aggregateSeries,
  buildEnvelopeSeries,
  periodPerformance,
  valueAt,
  type PeriodKey,
  type ValuationPoint,
} from "@/lib/portfolio/series";
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
  savings: number | null;
  equity: number | null;
  /** investi hors épargne (ligne pointillée) */
  invested: number | null;
  investedDisplay: number | null;
  /** investi total, épargne incluse (performance et tooltip) */
  investedTotal: number | null;
}

function mergeSeries(
  savings: ValuationPoint[],
  equity: ValuationPoint[],
  investedPoints: ValuationPoint[],
  investedTotalPoints: ValuationPoint[],
  investedOffset: boolean,
): ChartPoint[] {
  const times = [
    ...new Set([
      ...savings.map((v) => v.date.getTime()),
      ...equity.map((v) => v.date.getTime()),
      ...investedPoints.map((v) => v.date.getTime()),
      ...investedTotalPoints.map((v) => v.date.getTime()),
    ]),
  ].sort((a, b) => a - b);
  return times.map((time) => {
    const date = new Date(time);
    const savingsValue = savings.length > 0 ? valueAt(savings, date) / 100 : null;
    const investedValue =
      investedPoints.length > 0 ? valueAt(investedPoints, date) / 100 : null;
    const investedTotalValue =
      investedTotalPoints.length > 0
        ? valueAt(investedTotalPoints, date) / 100
        : investedValue;
    return {
      date: time,
      savings: savingsValue,
      equity: equity.length > 0 ? valueAt(equity, date) / 100 : null,
      invested: investedValue,
      investedDisplay:
        investedValue === null
          ? null
          : investedOffset
            ? investedValue + (savingsValue ?? 0)
            : investedValue,
      investedTotal: investedTotalValue,
    };
  });
}

export function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  const savings = point.savings;
  const equity = point.equity;
  const invested = point.investedTotal;
  const hasValue = savings !== null || equity !== null;
  const value = hasValue ? ((savings ?? 0) + (equity ?? 0)) * 100 : null;
  const investedCents = invested !== null ? invested * 100 : null;
  const gain = value !== null && investedCents !== null ? value - investedCents : null;
  return (
    <div className="rounded-lg border border-border-cw bg-bg-elevated p-3 text-xs shadow-lg">
      <p className="mb-2 font-medium text-text-primary">
        {new Date(point.date).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>
      {savings !== null ? (
        <p className="tabular-nums text-text-secondary">
          Épargne&nbsp;:{" "}
          <span className="font-medium" style={{ color: "var(--info)" }}>
            {formatEurCents(savings * 100)}
          </span>
        </p>
      ) : null}
      {equity !== null ? (
        <p className="tabular-nums text-text-secondary">
          Actions / ETF&nbsp;:{" "}
          <span className="font-medium text-positive">{formatEurCents(equity * 100)}</span>
        </p>
      ) : null}
      {invested !== null ? (
        <p className="tabular-nums text-text-secondary">
          Investi&nbsp;:{" "}
          <span className="font-medium" style={{ color: "var(--info)" }}>
            {formatEurCents(invested * 100)}
          </span>
        </p>
      ) : null}
      {gain !== null ? (
        <p className="mt-1 border-t border-border-cw pt-1 tabular-nums">
          Plus/moins-value&nbsp;:{" "}
          <span
            className={cn("font-medium", gain >= 0 ? "text-positive" : "text-negative")}
          >
            {gain >= 0 ? "+" : "−"}
            {formatEurCents(Math.abs(gain))}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export interface ChartSeriesToggle {
  id: string;
  label: string;
  kind: "savings" | "equity";
  series: ValuationPoint[];
  /** cumul investi de l'enveloppe (centimes), pour la courbe Investi */
  investedSeries?: ValuationPoint[];
}

export function WealthChart({
  valuations,
  envelopeToggles,
  visible,
  onToggleEnvelope,
  onToggleCategory,
}: {
  valuations: ValuationPoint[];
  envelopeToggles?: ChartSeriesToggle[];
  visible?: Record<string, boolean>;
  onToggleEnvelope?: (id: string) => void;
  onToggleCategory?: (kind: "savings" | "equity", next?: boolean) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [internalVisible, setInternalVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((envelopeToggles ?? []).map((t) => [t.id, true])),
  );
  const isControlled = visible !== undefined;
  const visibleState = isControlled ? visible : internalVisible;
  const toggleEnvelope =
    onToggleEnvelope ??
    ((id: string) => setInternalVisible((prev) => ({ ...prev, [id]: !(prev[id] ?? true) })));
  const toggles = envelopeToggles ?? [];
  const isAllVisible = toggles.length > 0 && toggles.every((t) => visibleState[t.id] ?? true);

  const { data, changeCents, changeRatio, hasSavings, hasEquity } = useMemo(() => {
    const visibleToggles = (envelopeToggles ?? []).filter((t) => visibleState[t.id] ?? true);
    const savings = aggregateSeries(
      visibleToggles.filter((t) => t.kind === "savings").map((t) => t.series),
    );
    const equity = aggregateSeries(
      visibleToggles.filter((t) => t.kind === "equity").map((t) => t.series),
    );
    const investedVisible = aggregateSeries(
      visibleToggles
        .filter((t) => t.kind === "equity")
        .map((t) => t.investedSeries ?? []),
    );
    const investedTotalVisible = aggregateSeries(
      visibleToggles.map((t) => t.investedSeries ?? []),
    );
    // performance sur les seules enveloppes visibles : les dépôts d'une enveloppe
    // masquée ne doivent pas rester dans la courbe de valorisation
    const visibleValuations = aggregateSeries(visibleToggles.map((t) => t.series));
    const series = buildEnvelopeSeries(valuations, 0, null, new Date(), period);
    const startBoundary =
      series.length > 0 ? series[0].date.getTime() : Number.NEGATIVE_INFINITY;
    const merged = mergeSeries(
      savings,
      equity,
      investedVisible,
      investedTotalVisible,
      true,
    ).filter((p) => p.date >= startBoundary);
    const performance = periodPerformance(visibleValuations, investedTotalVisible, period);
    return {
      data: merged,
      changeCents: performance.gainCents,
      changeRatio: performance.ratio,
      hasSavings: savings.length > 0,
      hasEquity: equity.length > 0,
    };
  }, [valuations, envelopeToggles, visibleState, period]);

  if (valuations.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-text-secondary">
        Ajoutez des valorisations pour voir l&apos;évolution de votre patrimoine.
      </p>
    );
  }

  return (
    <div>
      {toggles.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (onToggleCategory) {
                toggles.forEach((t) => onToggleCategory(t.kind, !isAllVisible));
              } else {
                setInternalVisible(Object.fromEntries(toggles.map((t) => [t.id, !isAllVisible])));
              }
            }}
            className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary"
          >
            {isAllVisible ? "Tout masquer" : "Tout afficher"}
          </button>
          {toggles.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={visibleState[t.id] ?? true}
              onClick={() => toggleEnvelope(t.id)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (visibleState[t.id] ?? true)
                  ? t.kind === "savings"
                    ? "border-info/50 bg-info/10 text-info"
                    : "border-positive/50 bg-positive/10 text-positive"
                  : "border-border-cw bg-bg-subtle text-text-muted hover:text-text-secondary",
              )}
            >
              {(visibleState[t.id] ?? true) ? "👁 " : ""}

              {t.label}
            </button>
          ))}
        </div>
      ) : null}
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
                {(Math.abs(changeRatio) * 100).toFixed(1).replace(".", ",")} % du capital investi)
              </span>
            ) : null}
            <span className="ml-1 font-normal text-text-muted">hors versements</span>
          </p>
        ) : null}
      </div>
      <div className="h-64" aria-label="Évolution du patrimoine et de l'investi">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--info)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--info)" stopOpacity={0.08} />
              </linearGradient>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.32} />
                <stop offset="100%" stopColor="var(--positive)" stopOpacity={0.1} />
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
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }} />
            <Area
              type="monotone"
              dataKey="savings"
              stackId="wealth"
              name="Épargne (livrets)"
              stroke="var(--info)"
              strokeWidth={2}
              fill="url(#savingsGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
              hide={!hasSavings}
            />
            <Area
              type="monotone"
              dataKey="equity"
              stackId="wealth"
              name="Actions / ETF"
              stroke="var(--positive)"
              strokeWidth={2}
              fill="url(#equityGradient)"
              isAnimationActive
              animationDuration={400}
              connectNulls
              hide={!hasEquity}
            />
            <Line
              type="monotone"
              dataKey="investedDisplay"
              name="Investi (hors épargne)"
              stroke="var(--info)"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
