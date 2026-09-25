"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Coins,
  Globe2,
  LineChart as LineIcon,
  PieChart as PieIcon,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, Kpi } from "@/components/ui";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";
import type { Dictionary } from "@/i18n/server";
import {
  ECONOMIES,
  OTHER_COUNTRIES_LABEL,
  ZONES,
} from "@/lib/analysis/geo-zones";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import type { ActionDetail } from "@/lib/analysis/action-detail";
import { fetchActionPriceHistoryAction } from "@/server/actions";
import { SidePanel } from "./side-panel";
import { EtfDetailPanel } from "./etf-detail-panel";
import { ActionDetailPanel } from "./action-detail-panel";
import {
  simulateTwoTracks,
  type SimulatorDefaults,
} from "@/lib/analysis/simulator";
import type {
  DiversificationResult,
  FeeAnalysisResult,
  FeeLine,
  IncomeAnalysisResult,
  IncomeLine,
  ScoreCriterionResult,
} from "@/lib/analysis/scanners";
import type {
  PerformanceLevel,
  PerformanceReport,
} from "@/lib/analysis/performance-report";

const CATEGORY_COLORS = [
  "#e84545",
  "#f5a623",
  "#34c77b",
  "#4a90d9",
  "#9b59b6",
  "#e8a33d",
  "#2ec4b6",
  "#d46fb0",
];

function colorFor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

type PanelId =
  | "frais"
  | "revenus"
  | "exposition"
  | "simulateur"
  | "performance"
  | "etf"
  | "action";

/* -------------------------------------------------------------------------- */
/*                              Cartes scanners                                */
/* -------------------------------------------------------------------------- */

function ScannerCard({
  id,
  title,
  icon,
  gradient,
  badge,
  kpi,
  kpiLabel,
  detail,
  onClick,
  disabled,
  comingSoon,
}: {
  id: PanelId;
  title: string;
  icon: React.ReactNode;
  gradient: string;
  badge: React.ReactNode;
  kpi: string;
  kpiLabel: string;
  detail: React.ReactNode;
  onClick: (id: PanelId) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  const { t } = useI18n();
  const isOpenable = !disabled && !comingSoon;
  return (
    <button
      type="button"
      disabled={!isOpenable}
      onClick={() => onClick(id)}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-lg border border-border-cw bg-bg-elevated p-6 text-left transition-all duration-200",
        isOpenable
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-accent-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:translate-y-0 active:scale-[0.99]"
          : "cursor-default opacity-60",
      )}
    >
      <div
        className={cn("pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200", gradient)}
        aria-hidden
      />
      {comingSoon ? (
        <span className="absolute right-4 top-4 text-[10px] font-medium uppercase tracking-wide text-text-muted">
          {t.analyse.comingSoon}
        </span>
      ) : null}
      <div className="relative flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-subtle text-accent-500 transition-colors group-hover:bg-accent-500/10">
          {icon}
        </span>
        {badge}
      </div>
      <p className="relative font-heading text-base font-semibold text-text-primary">{title}</p>
      <p className="relative font-heading text-3xl font-semibold tabular-nums text-text-primary">
        {kpi}
      </p>
      <p className="relative text-xs font-medium tracking-wide text-text-secondary uppercase">
        {kpiLabel}
      </p>
      <p className="relative text-xs text-text-muted">{detail}</p>
    </button>
  );
}

function feeBadge(rate: number | null, t: Dictionary) {
  const labels = t.analyse.cards.fees;
  if (rate === null) return <Badge tone="warning">{labels.badgeUnknown}</Badge>;
  if (rate < 0.005) return <Badge tone="positive">{labels.badgeLow}</Badge>;
  if (rate <= 0.01) return <Badge tone="warning">{labels.badgeMedium}</Badge>;
  return <Badge tone="negative">{labels.badgeHigh}</Badge>;
}

function scoreBadge(score: number | null) {
  if (score === null) return <Badge tone="neutral">—</Badge>;
  if (score >= 6) return <Badge tone="positive">{score}/10</Badge>;
  if (score >= 4) return <Badge tone="warning">{score}/10</Badge>;
  return <Badge tone="negative">{score}/10</Badge>;
}

/* -------------------------------------------------------------------------- */
/*                              Panneau frais                                  */
/* -------------------------------------------------------------------------- */

function FeePanel({
  fees,
  onSelectLine,
}: {
  fees: FeeAnalysisResult;
  onSelectLine: (line: FeeLine) => void;
}) {
  const { t } = useI18n();
  const loss20 = fees.projectedLossCents.find((p) => p.horizonYears === 20);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi
          label={t.analyse.fee.annualFees}
          value={formatEurCents(fees.annualCostCents)}
          sub={fees.feeRate !== null ? formatPercent(fees.feeRate) : undefined}
        />
        <Kpi label={t.analyse.fee.transactions} value={formatEurCents(fees.transactionFeesCents)} />
      </div>
      <div className="rounded-lg border border-negative/25 bg-negative/5 p-4">
        <p className="text-sm text-text-secondary">{t.analyse.fee.impact20}</p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-negative">
          −{formatEurCents(loss20?.lossCents ?? 0)}
        </p>
        <p className="mt-1 text-xs text-text-muted">{t.analyse.fee.impactDetail}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-cw">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
              <th className="px-3 py-2 font-medium">{t.analyse.fee.colTitle}</th>
              <th className="px-3 py-2 text-right font-medium">{t.analyse.fee.colValue}</th>
              <th className="px-3 py-2 text-right font-medium">{t.analyse.fee.colTer}</th>
              <th className="px-3 py-2 text-right font-medium">{t.analyse.fee.colCost}</th>
            </tr>
          </thead>
          <tbody>
            {fees.lines.map((line) => (
              <tr
                key={line.positionId}
                className={cn(
                  "border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30",
                  (line.isin || line.symbol) && "cursor-pointer",
                )}
                onClick={() => (line.isin || line.symbol) && onSelectLine(line)}
              >
                <td className="px-3 py-2 text-text-primary">{line.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatEurCents(line.valueCents)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {line.ter !== null ? formatPercent(line.ter) : "—"}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-negative">
                  {formatEurCents(line.annualCostCents)}
                </td>
              </tr>
            ))}
            {fees.lines.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-text-muted">
                  {t.analyse.fee.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">{t.analyse.fee.projectedLoss}</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={fees.projectedLossCents.map((p) => ({ ...p, lossEur: p.lossCents / 100 }))}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="horizonYears"
                tickFormatter={(v: number) => t.analyse.fee.yearsUnit.replace("{years}", String(v))}
                stroke="var(--text-muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "var(--bg-subtle)" }}
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [formatEurCents(Number(value) * 100), t.analyse.fee.tooltipLoss]}
              />
              <Bar dataKey="lossEur" radius={[4, 4, 0, 0]}>
                {fees.projectedLossCents.map((entry, index) => (
                  <Cell key={entry.horizonYears} fill={colorFor(index)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-text-muted">{t.analyse.fee.disclaimer}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Panneau revenus                                */
/* -------------------------------------------------------------------------- */

function IncomePanel({
  income,
  onSelectLine,
}: {
  income: IncomeAnalysisResult;
  onSelectLine: (line: IncomeLine) => void;
}) {
  const { t } = useI18n();
  const calendarData = income.monthlyCalendar.map((m) => ({
    label: `${t.analyse.months[m.month]} ${String(m.year).slice(2)}`,
    amountEur: m.amountCents / 100,
  }));
  const frequencyLabel = (line: IncomeLine) => {
    if (line.paymentsPerYear === null) return "—";
    if (line.paymentsPerYear === 12) return t.analyse.income.freqMonthly;
    if (line.paymentsPerYear === 4) return t.analyse.income.freqQuarterly;
    if (line.paymentsPerYear === 2) return t.analyse.income.freqSemiAnnual;
    if (line.paymentsPerYear === 1) return t.analyse.income.freqAnnual;
    return t.analyse.income.freqTimes.replace("{count}", String(line.paymentsPerYear));
  };
  const nextPaymentLabel = (line: IncomeLine) => {
    if (line.nextPayment === null) return "—";
    const { year, month, amountCents } = line.nextPayment;
    return t.analyse.income.nextPaymentValue
      .replace("{month}", t.analyse.months[month])
      .replace("{year}", String(year))
      .replace("{amount}", formatEurCents(amountCents));
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi label={t.analyse.income.cash12} value={formatEurCents(income.cashTwelveMonthsCents)} />
        <Kpi
          label={t.analyse.income.projection12}
          value={formatEurCents(income.projectedTwelveMonthsCents)}
          sub={t.analyse.income.projectionSub}
        />
      </div>
      {calendarData.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">{t.analyse.income.calendar}</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calendarData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="var(--text-muted)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "var(--bg-subtle)" }}
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatEurCents(Number(value) * 100), t.analyse.income.tooltipReceived]}
                />
                <Bar dataKey="amountEur" fill="var(--positive)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-border-cw">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
              <th className="px-3 py-2 font-medium">{t.analyse.income.colSource}</th>
              <th className="px-3 py-2 font-medium">{t.analyse.income.colFrequency}</th>
              <th className="px-3 py-2 font-medium">{t.analyse.income.colNextPayment}</th>
              <th className="px-3 py-2 text-right font-medium">{t.analyse.income.col12}</th>
              <th className="px-3 py-2 text-right font-medium">{t.analyse.income.colProjection}</th>
              <th className="px-3 py-2 text-right font-medium">{t.analyse.income.colYield}</th>
            </tr>
          </thead>
          <tbody>
            {income.lines.map((line) => (
              <tr
                key={line.positionId}
                className={cn(
                  "border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30",
                  (line.isin || line.symbol) && "cursor-pointer",
                )}
                onClick={() => (line.isin || line.symbol) && onSelectLine(line)}
              >
                <td className="px-3 py-2 text-text-primary">{line.name}</td>
                <td className="px-3 py-2 text-text-secondary">{frequencyLabel(line)}</td>
                <td className="px-3 py-2 text-text-secondary">{nextPaymentLabel(line)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatEurCents(line.twelveMonthsCents)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatEurCents(line.projectedCents)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {line.yieldOnValue !== null ? formatPercent(line.yieldOnValue) : "—"}
                </td>
              </tr>
            ))}
            {income.lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-text-muted">
                  {t.analyse.income.empty}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {income.excludedLines.length > 0 ? (
        <div className="rounded-lg border border-border-cw bg-bg-subtle/30 p-3">
          <p className="mb-2 text-xs font-medium text-text-secondary">
            {t.analyse.income.excludedTitle}
          </p>
          <ul className="space-y-1">
            {income.excludedLines.map((line) => (
              <li
                key={line.positionId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-text-secondary">
                  {line.name}
                  <span className="text-text-muted"> · {line.envelopeName}</span>
                </span>
                <span className="whitespace-nowrap text-text-muted">
                  {line.reason === "capitalizing"
                    ? t.analyse.income.excludedAcc
                    : t.analyse.income.excludedNoDividend}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="text-xs text-text-muted">{t.analyse.income.disclaimer}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                    Panneau diversification (secteur / géo)                  */
/* -------------------------------------------------------------------------- */

function DiversificationPanel({
  result,
  kind,
}: {
  result: DiversificationResult;
  kind: "sector" | "zone" | "country" | "economy";
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  const geoLabel = (key: string) =>
    kind === "zone"
      ? ZONES.find((z) => z.key === key)?.label ?? key
      : kind === "economy"
        ? ECONOMIES.find((e) => e.key === key)?.label ?? key
        : key === OTHER_COUNTRIES_LABEL
          ? t.analyse.diversification.otherCountries
          : key;
  const geoFlag = (key: string) =>
    kind === "zone"
      ? ZONES.find((z) => z.key === key)?.flag ?? ""
      : kind === "economy"
        ? ECONOMIES.find((e) => e.key === key)?.flag ?? ""
        : "";
  const scoreTone = (score: number | null): "positive" | "warning" | "negative" | undefined =>
    score === null ? undefined : score >= 7 ? "positive" : score >= 4 ? "warning" : "negative";
  const criterionLabel = (key: ScoreCriterionResult["key"]) =>
    t.analyse.diversification.criteria[key];
  const pieData = result.lines.slice(0, 8).map((line, index) => ({
    name: kind === "sector" ? line.sector : geoLabel(line.sector),
    value: line.amountCents / 100,
    color: colorFor(index),
  }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi
          label={t.analyse.diversification.score}
          value={result.score !== null ? `${result.score}/10` : "—"}
          sub={t.analyse.diversification.scoreSub}
          scoreTone={scoreTone(result.score)}
          scoreTotal={result.score !== null ? `${result.score}/10` : "—"}
          scoreLines={result.scoreBreakdown.map((c) => ({
            label: criterionLabel(c.key),
            delta: `${c.points > 0 ? "+" : ""}${c.points}/${c.max}`,
            tone: c.points === c.max ? "positive" : c.points > 0 ? "warning" : "negative",
          }))}
        />
        {result.lines[0] ? (
          <Kpi
            label={kind === "sector" ? t.analyse.diversification.topSector : t.analyse.diversification.topRegion}
            value={
              kind === "sector" ? result.lines[0].sector : geoLabel(result.lines[0].sector)
            }
            sub={formatPercent(result.lines[0].share)}
          />
        ) : null}
      </div>
      {result.alerts.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-warning/25 bg-warning/5 p-3">
          {result.alerts.map((alert) => (
            <p key={alert.label} className="break-words text-sm text-warning">
              ⚠ {geoLabel(alert.label)} : {formatPercent(alert.share)} —{" "}
              {t.analyse.diversification.via.replace("{detail}", alert.detail)}
            </p>
          ))}
        </div>
      ) : null}
      {pieData.length > 0 ? (
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="var(--bg-elevated)"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => formatEurCents(Number(value) * 100)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      <div className="space-y-2">
        {result.lines.map((line, index) => {
          const label =
            kind === "sector"
              ? line.sector
              : `${geoFlag(line.sector)} ${geoLabel(line.sector)}`.trim();
          const max = result.lines[0]?.amountCents ?? 1;
          return (
            <div key={line.sector}>
              <button
                type="button"
                onClick={() => setOpen(open === index ? null : index)}
                className="flex w-full items-center justify-between text-left text-sm"
                aria-expanded={open === index}
              >
                <span className="flex items-center gap-2 text-text-primary">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorFor(index) }}
                    aria-hidden
                  />
                  {label}
                </span>
                <span className="tabular-nums text-text-secondary">
                  {formatEurCents(line.amountCents)} · {formatPercent(line.share)}
                </span>
              </button>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${(line.amountCents / max) * 100}%`,
                    backgroundColor: colorFor(index),
                  }}
                />
              </div>
              {open === index ? (
                <ul className="mt-1 space-y-1">
                  {line.contributors.map((c) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between gap-2 pl-4 text-xs"
                    >
                      <span className="min-w-0 truncate text-text-secondary">{c.name}</span>
                      <span className="shrink-0 tabular-nums text-text-muted">
                        {formatEurCents(c.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
        {result.lines.length === 0 ? (
          <p className="py-6 text-center text-text-muted">
            {t.analyse.diversification.empty}
          </p>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">{t.analyse.diversification.disclaimer}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                    Panneau performance (XIRR / TWR / niveaux)               */
/* -------------------------------------------------------------------------- */

function formatSignedPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  // rendu signé en une passe : formatPercent ajouterait un « + » que ce
  // préfixe doublerait en « ++10,49 % » (ou « −+2,48 % » pour les pertes)
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(Math.abs(ratio));
  return `${ratio >= 0 ? "+" : "−"}${formatted}`;
}

function performanceBadge(xirrValue: number | null) {
  if (xirrValue === null) return <Badge tone="neutral">—</Badge>;
  if (xirrValue >= 0.05) return <Badge tone="positive">{formatPercent(xirrValue)}</Badge>;
  if (xirrValue >= 0) return <Badge tone="warning">{formatPercent(xirrValue)}</Badge>;
  return <Badge tone="negative">{formatPercent(xirrValue)}</Badge>;
}

type VerdictTone = "positive" | "warning" | "negative" | "neutral";

/**
 * Verdict sur la valeur finale du portefeuille, dans l'ordre du juge le plus
 * exigeant au plus laxiste : (1) la marche d'escalier DCA au cours RÉEL du
 * MSCI World sur vos propres versements — le vrai contre-factuel « un ETF
 * Monde simple aurait donné ça » ; (2) la référence à taux constant 8 %/an
 * ; (3) le livret. Bat le World réel → positive ; bat les références à
 * taux constant mais pas le World réel → warning ; sous le livret →
 * negative.
 */
function verdictTone(
  valueCents: number,
  realWorldValueCents: number | null,
  worldRefValueCents: number | null,
  savingsRefValueCents: number | null,
): VerdictTone {
  if (savingsRefValueCents === null && worldRefValueCents === null && realWorldValueCents === null) {
    return "neutral";
  }
  if (realWorldValueCents !== null) {
    if (valueCents >= realWorldValueCents) return "positive";
    if (
      savingsRefValueCents !== null &&
      valueCents >= savingsRefValueCents
    ) {
      return "warning";
    }
    return "negative";
  }
  if (worldRefValueCents !== null && valueCents >= worldRefValueCents) return "positive";
  if (savingsRefValueCents !== null && valueCents >= savingsRefValueCents) return "warning";
  if (savingsRefValueCents !== null) return "negative";
  return "neutral";
}

function signedEur(cents: number): string {
  return `${cents >= 0 ? "+" : "−"}${formatEurCents(Math.abs(cents))}`;
}

function PerformancePanel({
  report,
}: {
  report: PerformanceReport;
}) {
  const { t } = useI18n();
  const [detailTab, setDetailTab] = useState<"envelopes" | "assets">("envelopes");
  const total = report.total;
  const metrics = total.metrics;
  const xirrValue = metrics?.xirr ?? null;
  const twrValue = metrics?.twrAnnualized ?? metrics?.twrCumulative ?? null;
  const simpleValue = metrics?.simpleReturn ?? null;
  const savingsRef = report.savingsReference;
  const worldRef = report.worldReference;
  const verdict = verdictTone(
    total.valueCents,
    report.worldGrowth?.referenceValueCents ?? null,
    worldRef?.valueCents ?? null,
    savingsRef?.valueCents ?? null,
  );
  const verdictText =
    verdict === "positive"
      ? t.analyse.performance.verdictPositive
      : verdict === "warning"
        ? t.analyse.performance.verdictWarning
        : verdict === "negative"
          ? t.analyse.performance.verdictNegative
          : t.analyse.performance.verdictNeutral;
  const levels = detailTab === "envelopes" ? report.envelopes : report.positions;

  const levelsTable = (rows: PerformanceLevel[]) => (
    <div className="overflow-x-auto rounded-lg border border-border-cw">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
            <th className="px-3 py-2 font-medium">{t.analyse.performance.colName}</th>
            <th className="px-3 py-2 text-right font-medium">{t.analyse.performance.colValue}</th>
            <th className="px-3 py-2 text-right font-medium">{t.analyse.performance.colContributed}</th>
            <th className="px-3 py-2 text-right font-medium">{t.analyse.performance.colXirr}</th>
            <th className="px-3 py-2 text-right font-medium">{t.analyse.performance.colTwr}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((level) => {
            const m = level.metrics;
            return (
              <tr key={level.id} className="border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30">
                <td className="px-3 py-2 text-text-primary">{level.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatEurCents(level.valueCents)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatEurCents(level.contributedCents)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right font-semibold tabular-nums",
                    (m?.xirr ?? 0) >= 0 ? "text-positive" : "text-negative",
                  )}
                >
                  {formatSignedPercent(m?.xirr ?? null)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-secondary">
                  {formatSignedPercent(
                    m?.twrAnnualized ?? m?.twrCumulative ?? null,
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                {t.analyse.performance.emptyLevels}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi
          label={t.analyse.performance.xirrLabel}
          value={formatSignedPercent(xirrValue)}
          sub={t.analyse.performance.xirrSub}
          hint={t.analyse.performance.xirrHint}
          scoreTone={
            xirrValue === null
              ? undefined
              : xirrValue >= 0.05
                ? "positive"
                : xirrValue >= 0
                  ? "warning"
                  : "negative"
          }
        />
        <Kpi
          label={t.analyse.performance.twrLabel}
          value={formatSignedPercent(twrValue)}
          sub={
            metrics?.twrCumulative != null
              ? t.analyse.performance.twrSub.replace(
                  "{cumulative}",
                  formatSignedPercent(metrics.twrCumulative),
                )
              : undefined
          }
          hint={t.analyse.performance.twrHint}
        />
      </div>

      {simpleValue !== null ? (
        <div className="rounded-lg border border-border-cw bg-bg-subtle/40 p-4">
          <p className="text-sm text-text-secondary">
            {t.analyse.performance.simpleCompare
              .replace("{simple}", formatSignedPercent(simpleValue))
              .replace("{xirr}", formatSignedPercent(xirrValue))}
          </p>
          <p className="mt-1 text-xs text-text-muted">{t.analyse.performance.simpleWhy}</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-text-secondary">{t.analyse.performance.referencesTitle}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-info/25 bg-info/5 p-3">
            <p className="text-xs font-medium text-text-secondary">
              {t.analyse.performance.refSavings.replace("{rate}", formatPercent(report.savingsRate))}
            </p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-text-primary">
              {savingsRef !== null ? formatEurCents(savingsRef.valueCents) : "—"}
            </p>
            {savingsRef !== null ? (
              <p className="mt-0.5 text-xs tabular-nums text-text-secondary">
                {t.analyse.performance.refGain
                  .replace("{gain}", signedEur(savingsRef.gainCents))}
              </p>
            ) : null}
            {savingsRef !== null ? (
              <p
                className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  savingsRef.deltaCents >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {savingsRef.deltaCents >= 0
                  ? t.analyse.performance.aheadReference.replace(
                      "{delta}",
                      formatEurCents(Math.abs(savingsRef.deltaCents)),
                    )
                  : t.analyse.performance.behindReference.replace(
                      "{delta}",
                      formatEurCents(Math.abs(savingsRef.deltaCents)),
                    )}
              </p>
            ) : null}
          </div>
          <div className="rounded-lg border border-accent-500/25 bg-accent-500/5 p-3">
            <p className="text-xs font-medium text-text-secondary">
              {t.analyse.performance.refWorld.replace("{rate}", formatPercent(report.worldEquityRate))}
            </p>
            <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-text-primary">
              {worldRef !== null ? formatEurCents(worldRef.valueCents) : "—"}
            </p>
            {worldRef !== null ? (
              <p className="mt-0.5 text-xs tabular-nums text-text-secondary">
                {t.analyse.performance.refGain
                  .replace("{gain}", signedEur(worldRef.gainCents))}
              </p>
            ) : null}
            {worldRef !== null ? (
              <p
                className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  worldRef.deltaCents >= 0 ? "text-positive" : "text-negative",
                )}
              >
                {worldRef.deltaCents >= 0
                  ? t.analyse.performance.aheadReference.replace(
                      "{delta}",
                      formatEurCents(Math.abs(worldRef.deltaCents)),
                    )
                  : t.analyse.performance.behindReference.replace(
                      "{delta}",
                      formatEurCents(Math.abs(worldRef.deltaCents)),
                    )}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-xs text-text-muted">{t.analyse.performance.referencesHint}</p>
      </div>

      <div
        className={cn(
          "rounded-lg border p-4",
          verdict === "positive" && "border-positive/25 bg-positive/5",
          verdict === "warning" && "border-warning/25 bg-warning/5",
          verdict === "negative" && "border-negative/25 bg-negative/5",
          verdict === "neutral" && "border-border-cw bg-bg-subtle/40",
        )}
      >
        <p className="text-sm font-medium text-text-secondary">
          {t.analyse.performance.verdictTitle}
        </p>
        <p
          className={cn(
            "mt-1 text-sm",
            verdict === "positive" && "text-positive",
            verdict === "warning" && "text-warning",
            verdict === "negative" && "text-negative",
            verdict === "neutral" && "text-text-secondary",
          )}
        >
          {verdictText}
        </p>
        <p className="mt-1 text-xs text-text-muted">{t.analyse.performance.verdictHint}</p>
        {report.worldGrowth ? (
          <div className="mt-2 rounded-md border border-border-cw bg-bg-subtle/40 p-2">
            <p className="text-xs text-text-secondary">
              {t.analyse.performance.worldGrowthLine
                .replace("{cumulative}", formatSignedPercent(report.worldGrowth.cumulative))
                .replace(
                  "{annualized}",
                  report.worldGrowth.annualized !== null
                    ? formatSignedPercent(report.worldGrowth.annualized)
                    : t.analyse.performance.worldGrowthNa,
                )}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {t.analyse.performance.worldGrowthValue
                .replace("{value}", formatEurCents(report.worldGrowth.referenceValueCents))}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs tabular-nums",
                report.worldGrowth.deltaCents >= 0 ? "text-positive" : "text-negative",
              )}
            >
              {report.worldGrowth.deltaCents >= 0
                ? t.analyse.performance.aheadReference.replace(
                    "{delta}",
                    formatEurCents(Math.abs(report.worldGrowth.deltaCents)),
                  )
                : t.analyse.performance.behindReference.replace(
                    "{delta}",
                    formatEurCents(Math.abs(report.worldGrowth.deltaCents)),
                  )}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t.analyse.performance.worldGrowthHint
                .replace("{start}", report.worldGrowth.startDate.toLocaleDateString("fr-FR"))
                .replace("{end}", report.worldGrowth.endDate.toLocaleDateString("fr-FR"))}
            </p>
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/30 p-1">
          <button
            type="button"
            onClick={() => setDetailTab("envelopes")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              detailTab === "envelopes"
                ? "bg-accent-500/15 text-accent-500"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <Wallet className="h-4 w-4" aria-hidden />
            {t.analyse.performance.tabEnvelopes}
          </button>
          <button
            type="button"
            onClick={() => setDetailTab("assets")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              detailTab === "assets"
                ? "bg-accent-500/15 text-accent-500"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            <PieIcon className="h-4 w-4" aria-hidden />
            {t.analyse.performance.tabAssets}
          </button>
        </div>
        {levelsTable(levels)}
      </div>

      <p className="text-xs text-text-muted">{t.analyse.performance.disclaimer}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Simulateur interactif                                 */
/* -------------------------------------------------------------------------- */

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-secondary">{label}</label>
        <span className="font-semibold tabular-nums text-text-primary">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-bg-subtle accent-accent-500"
        style={{
          background: `linear-gradient(to right, var(--accent-500) ${((value - min) / (max - min)) * 100}%, var(--bg-subtle) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}

const SIM_STORAGE_KEY = "analyse-simulateur-params";

interface SimParams {
  horizonYears: number;
  withdrawalRate: number;
  equityReturn: number;
  extraSavings: number;
  useInflation: boolean;
  inflationRate: number;
}

function defaultSimParams(defaults: SimulatorDefaults): SimParams {
  return {
    horizonYears: 20,
    withdrawalRate: 4,
    equityReturn: defaults.equityReturn * 100,
    extraSavings: 0,
    useInflation: false,
    inflationRate: 2,
  };
}

function readSavedSimParams(): Partial<SimParams> | null {
  try {
    const raw = localStorage.getItem(SIM_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SimParams>) : null;
  } catch {
    return null;
  }
}

let simParamsCache: { raw: string | null; parsed: Partial<SimParams> | null } = {
  raw: undefined as unknown as string | null,
  parsed: null,
};

let simParamsListener: (() => void) | null = null;

/**
 * Paramètres du simulateur synchronisés avec le localStorage via
 * useSyncExternalStore : le rendu serveur et le premier rendu client
 * utilisent les défauts (pas de mismatch d'hydratation), puis la snapshot
 * client bascule sur les paramètres sauvegardés.
 */
function useSimParams(defaults: SimulatorDefaults): [
  SimParams,
  (patch: Partial<SimParams>) => void,
] {
  const base = useMemo(() => defaultSimParams(defaults), [defaults]);
  const subscribe = useCallback((onStoreChange: () => void) => {
    simParamsListener = onStoreChange;
    return () => {
      simParamsListener = null;
    };
  }, []);
  const saved = useSyncExternalStore(
    subscribe,
    () => {
      // snapshot stable : le JSON n'est reparé que si le contenu brut change
      let raw: string | null;
      try {
        raw = localStorage.getItem(SIM_STORAGE_KEY);
      } catch {
        raw = null;
      }
      if (simParamsCache.raw !== raw) {
        let parsed: Partial<SimParams> | null = null;
        try {
          parsed = raw ? (JSON.parse(raw) as Partial<SimParams>) : null;
        } catch {
          parsed = null;
        }
        simParamsCache = { raw, parsed };
      }
      return simParamsCache.parsed;
    },
    () => null,
  );
  const params = useMemo(
    () => ({ ...base, ...(saved ?? {}) }),
    [base, saved],
  );
  const update = useCallback((patch: Partial<SimParams>) => {
    try {
      const current = { ...base, ...(readSavedSimParams() ?? {}) };
      const next = { ...current, ...patch };
      localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // stockage indisponible : pas de persistance
    }
    simParamsListener?.();
  }, [base]);
  return [params, update];
}

function simulateFromParams(defaults: SimulatorDefaults, params: SimParams) {
  const monthlyInvested = defaults.monthlyDcaCents + params.extraSavings;
  const monthlySavings = Math.max(
    0,
    defaults.monthlySavingsCents - defaults.monthlyDcaCents - params.extraSavings,
  );
  return simulateTwoTracks({
    investedWealthCents: defaults.investedWealthCents,
    savingsWealthCents: defaults.savingsWealthCents,
    monthlyInvestedCents: monthlyInvested,
    monthlySavingsCents: monthlySavings,
    equityReturn: params.equityReturn / 100,
    savingsReturn: defaults.savingsReturn,
    inflation: params.useInflation ? params.inflationRate / 100 : 0,
    horizonYears: params.horizonYears,
  });
}

function SimulationPanel({
  defaults,
  params,
  onParamChange,
}: {
  defaults: SimulatorDefaults;
  params: SimParams;
  onParamChange: (patch: Partial<SimParams>) => void;
}) {
  const { t } = useI18n();
  const { horizonYears, withdrawalRate, equityReturn, extraSavings, useInflation, inflationRate } =
    params;
  const setHorizonYears = (v: number) => onParamChange({ horizonYears: v });
  const setWithdrawalRate = (v: number) => onParamChange({ withdrawalRate: v });
  const setEquityReturn = (v: number) => onParamChange({ equityReturn: v });
  const setExtraSavings = (v: number) => onParamChange({ extraSavings: v });
  const setUseInflation = (v: boolean) => onParamChange({ useInflation: v });
  const setInflationRate = (v: number) => onParamChange({ inflationRate: v });

  const simulation = useMemo(
    () => simulateFromParams(defaults, params),
    [defaults, params],
  );

  const finalPoint = simulation.points[simulation.points.length - 1];
  const monthlyRenteCents = Math.round(
    (finalPoint.totalCents * (withdrawalRate / 100)) / 12,
  );
  const monthlyRenteRealCents = Math.round(
    (finalPoint.totalRealCents * (withdrawalRate / 100)) / 12,
  );
  // apports totaux sur l'horizon : capital initial + versements cumulés
  const totalContributionsCents =
    defaults.investedWealthCents +
    defaults.savingsWealthCents +
    (defaults.monthlyDcaCents + extraSavings) * 12 * horizonYears +
    Math.max(0, defaults.monthlySavingsCents - defaults.monthlyDcaCents - extraSavings) * 12 * horizonYears;
  const totalGainCents = finalPoint.totalCents - totalContributionsCents;

  const chartData = simulation.points.map((p) => ({
    year: p.year,
    investedEur: p.investedCents / 100,
    savingsEur: p.savingsCents / 100,
    totalEur: p.totalCents / 100,
    totalRealEur: p.totalRealCents / 100,
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-positive/25 bg-gradient-to-br from-positive/10 to-transparent p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            {t.analyse.simulator.capitalHorizon.replace("{year}", String(finalPoint.year))}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-positive">
            {formatEurCents(finalPoint.totalCents)}
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-gold">
            <p>{t.analyse.simulator.interests.replace("{amount}", formatEurCents(totalGainCents))}</p>
            <p>{t.analyse.simulator.contributions.replace("{amount}", formatEurCents(totalContributionsCents))}</p>
            {useInflation ? (
              <p>{t.analyse.simulator.realEuros.replace("{amount}", formatEurCents(finalPoint.totalRealCents))}</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-accent-500/25 bg-gradient-to-br from-accent-500/10 to-transparent p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            {t.analyse.simulator.renteMonthly.replace("{rate}", withdrawalRate.toFixed(2))}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-accent-500">
            {t.analyse.simulator.renteValue.replace("{amount}", formatEurCents(monthlyRenteCents))}
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-gold">
            <p>{t.analyse.simulator.renteDetail.replace("{rate}", formatPercent(withdrawalRate / 100))}</p>
            {useInflation ? (
              <p>{t.analyse.simulator.renteReal.replace("{amount}", formatEurCents(monthlyRenteRealCents))}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `${Math.round(v / 1000)} k€`}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [formatEurCents(Number(value) * 100), name]}
            />
            <Line
              type="monotone"
              dataKey="investedEur"
              stroke="var(--positive)"
              strokeWidth={2}
              dot={false}
              name={t.analyse.simulator.seriesInvested}
            />
            <Line
              type="monotone"
              dataKey="savingsEur"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
              name={t.analyse.simulator.seriesSavings}
            />
            {useInflation ? (
              <Line
                type="monotone"
                dataKey="totalRealEur"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                name={t.analyse.simulator.seriesReal}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-4 rounded-lg border border-border-cw bg-bg-subtle/40 p-4">
        <Slider
          label={t.analyse.simulator.sliderHorizon}
          value={horizonYears}
          min={5}
          max={40}
          step={5}
          onChange={setHorizonYears}
          format={(v) => t.analyse.simulator.yearsUnit.replace("{years}", String(v))}
        />
        <Slider
          label={t.analyse.simulator.sliderWithdrawal}
          value={withdrawalRate}
          min={3}
          max={5}
          step={0.25}
          onChange={setWithdrawalRate}
          format={(v) => `${v.toFixed(2).replace(".", ",")} %`}
          hint={t.analyse.simulator.withdrawalHint}
        />
        <Slider
          label={t.analyse.simulator.sliderEquityReturn}
          value={equityReturn}
          min={2}
          max={12}
          step={0.5}
          onChange={setEquityReturn}
          format={(v) => `${v.toFixed(1).replace(".", ",")} %/an`}
          hint={t.analyse.simulator.equityReturnHint
            .replace("{rate}", formatPercent(defaults.equityReturn))
            .replace("{source}", defaults.returnSource === "historique"
              ? t.analyse.simulator.sourceHistorical
              : t.analyse.simulator.sourceAverage)}
        />
        <Slider
          label={t.analyse.simulator.sliderExtraSavings}
          value={extraSavings}
          min={0}
          max={200000}
          step={5000}
          onChange={setExtraSavings}
          format={(v) => formatEurCents(v)}
          hint={t.analyse.simulator.extraSavingsHint.replace("{amount}", formatEurCents(defaults.monthlyDcaCents))}
        />
        <div className="flex items-center justify-between">
          <label
            htmlFor="sim-inflation-toggle"
            className="text-sm font-medium text-text-secondary"
          >
            {t.analyse.simulator.inflationToggle}
          </label>
          <button
            id="sim-inflation-toggle"
            type="button"
            role="switch"
            aria-checked={useInflation}
            onClick={() => setUseInflation(!useInflation)}
            className={cn(
              "relative h-6 w-11 rounded-full transition-colors",
              useInflation ? "bg-accent-500" : "bg-bg-subtle",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                useInflation ? "left-[22px]" : "left-0.5",
              )}
            />
          </button>
        </div>
        {useInflation ? (
          <Slider
            label={t.analyse.simulator.sliderInflation}
            value={inflationRate}
            min={0}
            max={10}
            step={0.25}
            onChange={setInflationRate}
            format={(v) => `${v.toFixed(2).replace(".", ",")} %`}
            hint={t.analyse.simulator.inflationHint}
          />
        ) : null}
      </div>
      <p className="text-xs text-text-muted">
        {t.analyse.simulator.disclaimer
          .replace("{rate}", formatPercent(defaults.savingsReturn))
          .replace("{amount}", formatEurCents(Math.max(0, defaults.monthlySavingsCents - defaults.monthlyDcaCents)))}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*              Carte Simulateur (pleine largeur, graphique intégré)           */
/* -------------------------------------------------------------------------- */

function SimulatorCard({
  defaults,
  params,
  onClick,
}: {
  defaults: SimulatorDefaults;
  params: SimParams;
  onClick: (id: PanelId) => void;
}) {
  const { t } = useI18n();
  const simulation = useMemo(() => simulateFromParams(defaults, params), [defaults, params]);
  const finalPoint = simulation.points[simulation.points.length - 1];
  const chartData = simulation.points.map((p) => ({
    year: p.year,
    totalEur: p.totalCents / 100,
    investedEur: p.investedCents / 100,
    savingsEur: p.savingsCents / 100,
  }));
  return (
    <button
      type="button"
      onClick={() => onClick("simulateur")}
      className="group relative col-span-1 flex flex-col gap-3 overflow-hidden rounded-lg border border-border-cw bg-bg-elevated p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:translate-y-0 active:scale-[0.99] lg:col-span-3"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-warning/10 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-subtle text-accent-500 transition-colors group-hover:bg-accent-500/10">
            <TrendingUp className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="font-heading text-base font-semibold text-text-primary">
              {t.analyse.cards.simulator.title}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t.analyse.cards.simulator.subtitle
                .replace("{years}", String(params.horizonYears))
                .replace("{rate}", formatPercent(params.equityReturn / 100))
                .replace("{amount}", formatEurCents(defaults.monthlyDcaCents + params.extraSavings))}
            </p>
          </div>
        </div>
        <div className="flex items-end gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              {t.analyse.cards.simulator.capitalProjected.replace("{year}", String(finalPoint.year))}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-positive">
              {formatEurCents(finalPoint.totalCents)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              {t.analyse.cards.simulator.rente.replace("{rate}", params.withdrawalRate.toFixed(2))}
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-accent-500">
              {t.analyse.cards.simulator.perMonth.length > 0 ? formatEurCents(
                Math.round((finalPoint.totalCents * (params.withdrawalRate / 100)) / 12),
              ) : ""}{t.analyse.cards.simulator.perMonth}
            </p>
          </div>
        </div>
      </div>
      <div className="relative h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="year" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value, name) => [formatEurCents(Number(value) * 100), name]}
            />
            <Line
              type="monotone"
              dataKey="investedEur"
              stroke="var(--positive)"
              strokeWidth={2}
              dot={false}
              name={t.analyse.cards.simulator.seriesInvested}
            />
            <Line
              type="monotone"
              dataKey="savingsEur"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
              name={t.analyse.cards.simulator.seriesSavings}
            />
            <Line
              type="monotone"
              dataKey="totalEur"
              stroke="var(--text-secondary)"
              strokeWidth={2.5}
              dot={false}
              name={t.analyse.cards.simulator.seriesTotal}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="relative text-xs text-text-muted">
        {t.analyse.cards.simulator.detail
          .replace("{invested}", formatEurCents(defaults.investedWealthCents))
          .replace("{savings}", formatEurCents(defaults.savingsWealthCents))}
      </p>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                 Carte Exposition (géo | secteur, 2 colonnes)                 */
/* -------------------------------------------------------------------------- */

function ExposureCard({
  sectors,
  regions,
  onClick,
}: {
  sectors: DiversificationResult;
  regions: DiversificationResult;
  onClick: (id: PanelId) => void;
}) {
  const { t } = useI18n();
  const disabled = sectors.lines.length === 0 && regions.lines.length === 0;
  const topRegion = regions.lines[0]
    ? ZONES.find((z) => z.key === regions.lines[0].sector)
    : null;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick("exposition")}
      className={cn(
        "group relative col-span-1 flex flex-col gap-2 overflow-hidden rounded-lg border border-border-cw bg-bg-elevated p-6 text-left transition-all duration-200 sm:col-span-2",
        disabled
          ? "cursor-default opacity-60"
          : "cursor-pointer hover:-translate-y-0.5 hover:border-accent-500/40 hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] active:translate-y-0 active:scale-[0.99]",
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/10 via-transparent to-info/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-subtle text-accent-500 transition-colors group-hover:bg-accent-500/10">
          <Globe2 className="h-5 w-5" aria-hidden />
        </span>
        {scoreBadge(sectors.score ?? regions.score)}
      </div>
      <p className="relative font-heading text-base font-semibold text-text-primary">
        {t.analyse.cards.exposure.title}
      </p>
      <div className="relative grid grid-cols-1 divide-y divide-border-cw sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="sm:pr-6 sm:border-0">
          <p className="font-heading text-base font-semibold text-text-primary">
            {topRegion?.flag ?? ""} {topRegion?.label ?? t.analyse.cards.exposure.geography}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {regions.lines[0] ? formatPercent(regions.lines[0].share) : "—"}
          </p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-text-secondary uppercase">
            {t.analyse.cards.exposure.dominantZone.replace("{count}", String(regions.lines.length))}
          </p>
        </div>
        <div className="sm:pl-6">
          <p className="font-heading text-base font-semibold text-text-primary">
            {sectors.lines[0]?.sector ?? t.analyse.cards.exposure.sectors}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {sectors.lines[0] ? formatPercent(sectors.lines[0].share) : "—"}
          </p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-text-secondary uppercase">
            {t.analyse.cards.exposure.dominantSector.replace("{count}", String(sectors.lines.length))}
          </p>
        </div>
      </div>
      <p className="relative text-xs text-text-muted">{t.analyse.cards.exposure.detail}</p>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                    Panneau Exposition (onglets secteur/géo)                  */
/* -------------------------------------------------------------------------- */

function ExposurePanel({
  sectors,
  regions,
  countries,
  economies,
}: {
  sectors: DiversificationResult;
  regions: DiversificationResult;
  /** répartition par pays (vue détaillée), pays < 1 % regroupés */
  countries: DiversificationResult;
  /** répartition par type d'économie MSCI (développée / émergente / frontière) */
  economies: DiversificationResult;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"sector" | "region">("region");
  const [geoView, setGeoView] = useState<"zone" | "country" | "economy">("zone");
  const geoResult =
    geoView === "zone" ? regions : geoView === "country" ? countries : economies;
  const result = tab === "region" ? geoResult : sectors;
  const geoKind = tab === "region" ? geoView : "sector";
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/50 p-1">
        <button
          type="button"
          onClick={() => setTab("region")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
            tab === "region"
              ? "bg-accent-500/15 text-accent-500"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <Globe2 className="h-4 w-4" aria-hidden />
          {t.analyse.diversification.tabGeographic}
        </button>
        <button
          type="button"
          onClick={() => setTab("sector")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all",
            tab === "sector"
              ? "bg-accent-500/15 text-accent-500"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          <PieIcon className="h-4 w-4" aria-hidden />
          {t.analyse.diversification.tabSector}
        </button>
      </div>
      {tab === "region" ? (
        <div className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/30 p-1">
          <button
            type="button"
            onClick={() => setGeoView("zone")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              geoView === "zone"
                ? "bg-accent-500/15 text-accent-500"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.analyse.diversification.viewZone}
          </button>
          <button
            type="button"
            onClick={() => setGeoView("country")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              geoView === "country"
                ? "bg-accent-500/15 text-accent-500"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.analyse.diversification.viewCountry.replace(
              "{count}",
              String(countries.lines.filter((l) => l.sector !== OTHER_COUNTRIES_LABEL).length),
            )}
          </button>
          <button
            type="button"
            onClick={() => setGeoView("economy")}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              geoView === "economy"
                ? "bg-accent-500/15 text-accent-500"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {t.analyse.diversification.viewEconomy}
          </button>
        </div>
      ) : null}
      <DiversificationPanel result={result} kind={geoKind} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Vue principale                                   */
/* -------------------------------------------------------------------------- */

export function AnalysisPageView({
  fees,
  income,
  sectors,
  regions,
  countries,
  economies,
  simulatorDefaults,
  performance,
  etfDetails,
  actionDetails,
}: {
  fees: FeeAnalysisResult;
  income: IncomeAnalysisResult;
  /** répartition par zone continentale */
  regions: DiversificationResult;
  /** répartition par pays (vue détaillée), pays < 1 % regroupés */
  countries: DiversificationResult;
  /** répartition par type d'économie MSCI (développée / émergente / frontière) */
  economies: DiversificationResult;
  sectors: DiversificationResult;
  simulatorDefaults: SimulatorDefaults;
  /** rapport de performance XIRR / TWR par niveau (global, enveloppes, actifs) */
  performance: PerformanceReport;
  /** détails CSV par ISIN, pour le panneau latéral ETF */
  etfDetails: Record<string, EtfDetail>;
  /** détails CSV des actions, par symbole Yahoo ou ISIN */
  actionDetails: Record<string, ActionDetail>;
}) {
  const { t } = useI18n();
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [selectedIsin, setSelectedIsin] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionDetail | null>(null);
  const [priceHistory, setPriceHistory] = useState<
    { date: string; price: number }[]
  >([]);
  const [previousPanel, setPreviousPanel] = useState<PanelId | null>(null);
  const [simParams, updateSimParams] = useSimParams(simulatorDefaults);
  const open = (id: PanelId) => {
    setPreviousPanel(null);
    setOpenPanel(id);
  };
  const close = () => {
    setOpenPanel(null);
    setPreviousPanel(null);
    setSelectedAction(null);
    setPriceHistory([]);
  };
  const openEtf = (isin: string) => {
    setSelectedAction(null);
    setPriceHistory([]);
    setSelectedIsin(isin);
    setPreviousPanel((prev) => (prev === null ? openPanel : prev));
    setOpenPanel("etf");
  };
  const openAction = async (action: ActionDetail) => {
    setSelectedIsin(null);
    setSelectedAction(action);
    setPriceHistory([]);
    setPreviousPanel((prev) => (prev === null ? openPanel : prev));
    setOpenPanel("action");
    try {
      const history = await fetchActionPriceHistoryAction(action.tickerYahoo);
      if (history.ok) setPriceHistory(history.points);
    } catch {
      // historique indisponible : le panneau s'affiche sans graphique
    }
  };
  const openPosition = ({
    isin,
    symbol,
  }: {
    isin: string | null;
    symbol: string | null;
  }) => {
    if (isin && etfDetails[isin]) {
      openEtf(isin);
      return;
    }
    const candidates = [symbol?.trim().toUpperCase(), isin].filter(
      (value): value is string => value !== null && value !== undefined && value !== "",
    );
    for (const candidate of candidates) {
      const action = actionDetails[candidate];
      if (action) {
        void openAction(action);
        return;
      }
    }
  };
  const back = () => {
    if (previousPanel === null) return;
    setOpenPanel(previousPanel);
    setPreviousPanel(null);
  };

  const panels: Record<
    PanelId,
    { title: string; subtitle?: string; icon: React.ReactNode }
  > = {
    frais: {
      title: t.analyse.panels.frais.title,
      subtitle: t.analyse.panels.frais.subtitle,
      icon: <Receipt className="h-5 w-5" aria-hidden />,
    },
    revenus: {
      title: t.analyse.panels.revenus.title,
      subtitle: t.analyse.panels.revenus.subtitle,
      icon: <Coins className="h-5 w-5" aria-hidden />,
    },
    exposition: {
      title: t.analyse.panels.exposition.title,
      subtitle: t.analyse.panels.exposition.subtitle,
      icon: <PieIcon className="h-5 w-5" aria-hidden />,
    },
    simulateur: {
      title: t.analyse.panels.simulateur.title,
      subtitle: t.analyse.panels.simulateur.subtitle,
      icon: <TrendingUp className="h-5 w-5" aria-hidden />,
    },
    performance: {
      title: t.analyse.panels.performance.title,
      subtitle: t.analyse.panels.performance.subtitle,
      icon: <Activity className="h-5 w-5" aria-hidden />,
    },
    etf: {
      title:
        selectedIsin
          ? (etfDetails[selectedIsin]?.trName ||
            etfDetails[selectedIsin]?.name ||
            selectedIsin)
          : t.analyse.panels.etf,
      subtitle: selectedIsin !== null ? selectedIsin : undefined,
      icon: <PieIcon className="h-5 w-5" aria-hidden />,
    },
    action: {
      title: selectedAction
        ? selectedAction.longName || selectedAction.name
        : t.analyse.panels.action,
      subtitle: selectedAction
        ? `${selectedAction.ticker} · ${selectedAction.exchange || selectedAction.tickerYahoo}`
        : undefined,
      icon: <LineIcon className="h-5 w-5" aria-hidden />,
    },
  };

  const loss20 = fees.projectedLossCents.find((p) => p.horizonYears === 20);

  // texte copié depuis le panneau ouvert : un résumé structuré selon le scanner
  const panelCopyText = useMemo<string | undefined>(() => {
    if (openPanel === "etf" && selectedIsin && etfDetails[selectedIsin]) {
      return JSON.stringify(etfDetails[selectedIsin], null, 2);
    }
    if (openPanel === "action" && selectedAction) {
      return JSON.stringify(selectedAction, null, 2);
    }
    if (openPanel === "frais") return JSON.stringify(fees, null, 2);
    if (openPanel === "revenus") return JSON.stringify(income, null, 2);
    if (openPanel === "exposition") {
      return JSON.stringify({ sectors, regions, countries, economies }, null, 2);
    }
    if (openPanel === "simulateur") {
      return JSON.stringify(
        { defaults: simulatorDefaults, params: simParams },
        null,
        2,
      );
    }
    if (openPanel === "performance") return JSON.stringify(performance, null, 2);
    return undefined;
  }, [
    openPanel,
    selectedIsin,
    selectedAction,
    etfDetails,
    fees,
    income,
    sectors,
    regions,
    countries,
    economies,
    simulatorDefaults,
    simParams,
    performance,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t.analyse.title}</h1>
        <p className="mt-0.5 text-sm text-text-secondary">{t.analyse.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScannerCard
          id="frais"
          title={t.analyse.cards.fees.title}
          icon={<Receipt className="h-5 w-5" aria-hidden />}
          gradient="bg-gradient-to-br from-negative/10 via-transparent to-transparent"
          badge={feeBadge(fees.feeRate, t)}
          kpi={fees.feeRate !== null ? formatPercent(fees.feeRate) : "—"}
          kpiLabel={
            fees.feeRate !== null
              ? t.analyse.cards.fees.kpiLabel.replace("{amount}", formatEurCents(fees.annualCostCents))
              : t.analyse.cards.fees.kpiLabelUnknown
          }
          detail={
            <>
              {t.analyse.cards.fees.detailLine1.replace("{amount}", formatEurCents(fees.annualCostCents))}
              <br />
              {t.analyse.cards.fees.detailLine2.replace("{amount}", formatEurCents(loss20?.lossCents ?? 0))}
            </>
          }
          onClick={open}
          disabled={fees.lines.length === 0}
        />
        <ScannerCard
          id="revenus"
          title={t.analyse.cards.income.title}
          icon={<Coins className="h-5 w-5" aria-hidden />}
          gradient="bg-gradient-to-br from-positive/10 via-transparent to-transparent"
          badge={<Badge tone="neutral">{t.analyse.cards.income.badge}</Badge>}
          kpi={formatEurCents(income.cashTwelveMonthsCents)}
          kpiLabel={t.analyse.cards.income.kpiLabel}
          detail={
            <>
              {t.analyse.cards.income.detailLine1.replace("{amount}", formatEurCents(income.projectedTwelveMonthsCents))}
              <br />
              {t.analyse.cards.income.detailLine2.replace("{rate}", income.yieldOnValue !== null ? formatPercent(income.yieldOnValue) : "—")}
            </>
          }
          onClick={open}
          disabled={income.lines.length === 0 && income.excludedLines.length === 0}
        />
        <ScannerCard
          id="performance"
          title={t.analyse.cards.performance.title}
          icon={<Activity className="h-5 w-5" aria-hidden />}
          gradient="bg-gradient-to-br from-info/10 via-transparent to-positive/10"
          badge={performanceBadge(performance.total.metrics?.xirr ?? null)}
          kpi={formatSignedPercent(performance.total.metrics?.xirr ?? null)}
          kpiLabel={t.analyse.cards.performance.kpiLabel}
          detail={
            <>
              {t.analyse.cards.performance.detailLine1.replace(
                "{gain}",
                performance.total.metrics?.gainCents != null
                  ? formatEurCents(performance.total.metrics.gainCents)
                  : "—",
              )}
              <br />
              {t.analyse.cards.performance.detailLine2.replace(
                "{twr}",
                // période ≤ 1 an : le Modified Dietz annualisé n'est pas défini,
                // on affiche le cumulé (plus honnête qu'un annualisé court)
                formatSignedPercent(
                  performance.total.metrics?.twrAnnualized ??
                    performance.total.metrics?.twrCumulative ??
                    null,
                ),
              )}
            </>
          }
          onClick={open}
          disabled={
            performance.total.metrics?.xirr === null &&
            performance.total.metrics?.twrCumulative === null
          }
        />
        <ExposureCard
          sectors={sectors}
          regions={regions}
          onClick={open}
        />
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-cw p-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-bg-subtle text-text-muted">
            <Wallet className="h-5 w-5" aria-hidden />
          </span>
          <p className="font-heading text-base font-semibold text-text-muted">
            {t.analyse.soonTitle}
          </p>
          <p className="text-xs text-text-muted">{t.analyse.soonText}</p>
        </div>
        <SimulatorCard defaults={simulatorDefaults} params={simParams} onClick={open} />
      </div>

      <SidePanel
        open={openPanel !== null}
        onClose={close}
        onBack={
          (openPanel === "etf" || openPanel === "action") && previousPanel !== null
            ? back
            : undefined
        }
        backLabel={
          (openPanel === "etf" || openPanel === "action") && previousPanel !== null
            ? t.analyse.panels.back.replace("{title}", panels[previousPanel].title)
            : undefined
        }
        title={openPanel !== null ? panels[openPanel].title : ""}
        subtitle={openPanel !== null ? panels[openPanel].subtitle : undefined}
        icon={openPanel !== null ? panels[openPanel].icon : undefined}
        copyText={panelCopyText}
        copyLabel={t.common.copyDetail}
     >
        {openPanel === "frais" ? (
          <FeePanel fees={fees} onSelectLine={openPosition} />
        ) : null}
        {openPanel === "revenus" ? (
          <IncomePanel income={income} onSelectLine={openPosition} />
        ) : null}
        {openPanel === "exposition" ? (
          <ExposurePanel
            sectors={sectors}
            regions={regions}
            countries={countries}
            economies={economies}
          />
        ) : null}
        {openPanel === "simulateur" ? (
          <SimulationPanel
            defaults={simulatorDefaults}
            params={simParams}
            onParamChange={updateSimParams}
          />
        ) : null}
        {openPanel === "etf" && selectedIsin && etfDetails[selectedIsin] ? (
          <EtfDetailPanel etf={etfDetails[selectedIsin]} />
        ) : null}
        {openPanel === "action" && selectedAction ? (
          <ActionDetailPanel
            action={selectedAction}
            priceHistory={priceHistory}
          />
        ) : null}
        {openPanel === "performance" ? (
          <PerformancePanel report={performance} />
        ) : null}
      </SidePanel>
    </div>
  );
}
