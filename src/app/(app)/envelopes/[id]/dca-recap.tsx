"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CalendarClock, Coins, PieChart as PieChartIcon, LayoutGrid } from "lucide-react";
import type { DcaWindowSummary } from "@/lib/dca";
import { formatEurCents, formatEurCentsCompact } from "@/lib/money";

import type { DcaSlice } from "./dca-section";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";

type PeriodKey = "1m" | "3m" | "1y";

const PERIOD_KEYS: PeriodKey[] = ["1m", "3m", "1y"];

type ChartKind = "bar" | "donut" | "treemap";

const CHART_KINDS: { key: ChartKind; icon: typeof BarChart3 }[] = [
  { key: "bar", icon: BarChart3 },
  { key: "donut", icon: PieChartIcon },
  { key: "treemap", icon: LayoutGrid },
];

const SLICE_COLORS = [
  "#e84545",
  "#f5a623",
  "#34c77b",
  "#4a90d9",
  "#9b59b6",
  "#e8a33d",
  "#2ec4b6",
  "#d46fb0",
];

function formatCompact(cents: number): string {
  return formatEurCentsCompact(cents);
}

export function DcaRecap({
  envelopeType,
  summaries,
  slices,
}: {
  envelopeType: "PEA" | "CTO" | "PRIV";
  summaries: Record<PeriodKey, DcaWindowSummary>;
  slices: DcaSlice[];
}) {
  const { t } = useI18n();
  const PERIODS = PERIOD_KEYS.map((key) => ({ key, label: t.envelopes.dca.recap.periods[key] }));
  const [period, setPeriod] = useState<PeriodKey>("1m");
  const [chartKind, setChartKind] = useState<ChartKind>("bar");

  const summary = summaries[period];
  const periodPayments = period === "1m" ? 1 : period === "3m" ? 3 : 12;
  const periodSlices = slices.map((slice) => ({
    ...slice,
    maxCents: slice.maxCents * Math.max(periodPayments, slice.paymentsCount),
    estimatedCents: slice.estimatedCents * Math.max(periodPayments, slice.paymentsCount),
  }));
  const totalMax = periodSlices.reduce((sum, slice) => sum + slice.maxCents, 0);

  return (
    <div className="grid grid-cols-1 gap-6 border-b border-border-cw p-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4">
        <div
          className="flex rounded-lg border border-border-cw bg-bg-subtle p-1"
          role="tablist"
          aria-label={t.envelopes.dca.recap.periodGroup}
        >
          {PERIODS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={period === key}
              onClick={() => setPeriod(key)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
                period === key
                  ? "bg-bg-elevated text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-positive/25 bg-positive/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
            <Coins className="h-3.5 w-3.5 text-positive" aria-hidden />
            {t.envelopes.dca.recap.committed.replace("{period}", PERIODS.find((p) => p.key === period)?.label ?? "")}
          </p>
          <p className="mt-1 font-heading text-3xl font-semibold text-positive tabular-nums">
            {formatEurCents(summary.totalEstimatedCents)}
          </p>
          <p className="mt-0.5 text-sm text-text-secondary tabular-nums">
            {t.envelopes.dca.recap.max.replace("{amount}", formatEurCents(summary.totalMaxCents))}
            {summary.totalEstimatedCents !== summary.totalMaxCents ? (
              <span className="text-warning"> {t.envelopes.dca.recap.nonInvested.replace("{amount}", formatEurCents(summary.totalMaxCents - summary.totalEstimatedCents))}</span>
            ) : null}
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <CalendarClock className="h-4 w-4 text-text-muted" aria-hidden />
          <span className="tabular-nums">
            <span className="font-semibold text-text-primary">{summary.paymentsCount}</span>{" "}
            {t.envelopes.dca.recap.paymentsCount
              .replace("{count}", String(summary.paymentsCount))
              .replace("{s}", summary.paymentsCount > 1 ? "s" : "")
              .replace("{s2}", summary.paymentsCount > 1 ? "s" : "")}
          </span>
        </div>
        {envelopeType === "PEA" ? (
          <p className="text-xs text-text-muted">
            {t.envelopes.dca.recap.peaNote}
          </p>
        ) : envelopeType === "PRIV" ? (
          <p className="text-xs text-text-muted">
            {t.envelopes.dca.recap.privNote}
          </p>
        ) : (
          <p className="text-xs text-text-muted">
            {t.envelopes.dca.recap.ctoNote}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {t.envelopes.dca.recap.breakdown}
          </p>
          <div
            className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle p-1"
            role="group"
            aria-label={t.envelopes.dca.recap.chartKindGroup}
          >
            {CHART_KINDS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                type="button"
                aria-pressed={chartKind === key}
                onClick={() => setChartKind(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                  chartKind === key
                    ? "bg-bg-elevated font-medium text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-secondary",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {t.envelopes.dca.recap.chartKinds[key]}
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          {chartKind === "bar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={periodSlices} layout="vertical" margin={{ left: 8, right: 36 }}>
                <XAxis type="number" hide domain={[0, totalMax || 1]} />
                <YAxis
                  type="category"
                  dataKey="ticker"
                  width={64}
                  tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const slice = payload[0].payload as DcaSlice & { maxCents: number };
                    return (
                      <div className="rounded-lg border border-border-cw bg-bg-elevated px-3 py-2 text-xs shadow-xl">
                        <p className="font-medium text-text-primary">{slice.ticker}</p>
                        <p className="text-positive tabular-nums">
                          {formatEurCents(slice.maxCents)}
                        </p>
                        <p className="text-text-muted">
                          {totalMax > 0
                            ? `${((slice.maxCents / totalMax) * 100).toFixed(1).replace(".", ",")} %`
                            : "—"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="maxCents" radius={[0, 4, 4, 0]} barSize={20}>
                  {periodSlices.map((slice, index) => (
                    <Cell key={slice.ticker} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : chartKind === "donut" ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={periodSlices}
                  dataKey="maxCents"
                  nameKey="ticker"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="var(--bg-elevated)"
                  strokeWidth={2}
                >
                  {periodSlices.map((slice, index) => (
                    <Cell key={slice.ticker} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const slice = payload[0].payload as DcaSlice;
                    return (
                      <div className="rounded-lg border border-border-cw bg-bg-elevated px-3 py-2 text-xs shadow-xl">
                        <p className="font-medium text-text-primary">{slice.ticker}</p>
                        <p className="text-positive tabular-nums">
                          {formatEurCents(slice.maxCents)}
                        </p>
                        <p className="text-text-muted">
                          {totalMax > 0
                            ? `${((slice.maxCents / totalMax) * 100).toFixed(1).replace(".", ",")} %`
                            : "—"}
                        </p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Treemap slices={periodSlices} totalMax={totalMax} />
          )}
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          {periodSlices.map((slice, index) => (
            <li key={slice.ticker} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-[2px]"
                style={{ backgroundColor: SLICE_COLORS[index % SLICE_COLORS.length] }}
                aria-hidden
              />
              <span className="font-medium text-text-primary">{slice.ticker}</span>
              <span className="tabular-nums text-text-muted">
                {formatCompact(slice.maxCents)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Treemap({ slices, totalMax }: { slices: DcaSlice[]; totalMax: number }) {
  const area = slices.reduce((sum, slice) => sum + slice.maxCents, 0) || 1;
  return (
    <div className="flex h-full w-full flex-wrap gap-1 overflow-hidden rounded-lg">
      {slices
        .slice()
        .sort((a, b) => b.maxCents - a.maxCents)
        .map((slice, index) => {
          const percent = slice.maxCents / area;
          const color = SLICE_COLORS[index % SLICE_COLORS.length];
          return (
            <div
              key={slice.ticker}
              className="flex min-w-[80px] flex-col justify-between overflow-hidden rounded-md p-2"
              style={{
                backgroundColor: color,
                opacity: 0.25 + 0.75 * percent,
                flexGrow: slice.maxCents,
                flexBasis: "36%",
              }}
              title={`${slice.ticker} — ${formatEurCents(slice.maxCents)} (${((slice.maxCents / (totalMax || 1)) * 100).toFixed(1).replace(".", ",")} %)`}
            >
              <span className="truncate text-xs font-semibold text-white drop-shadow">
                {slice.ticker}
              </span>
              <span className="truncate text-[10px] text-white/80 tabular-nums">
                {formatCompact(slice.maxCents)}
              </span>
            </div>
          );
        })}
    </div>
  );
}
