"use client";

import { useEffect, useMemo, useState } from "react";
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
  Coins,
  Globe2,
  PieChart as PieIcon,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, Kpi } from "@/components/ui";
import { cn } from "@/components/cn";
import { REGIONS } from "@/lib/analysis/exposure-catalog";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import { SidePanel } from "./side-panel";
import { EtfDetailPanel } from "./etf-detail-panel";
import {
  simulateTwoTracks,
  type SimulatorDefaults,
} from "@/lib/analysis/simulator";
import type {
  DiversificationResult,
  FeeAnalysisResult,
  IncomeAnalysisResult,
} from "@/lib/analysis/scanners";

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

type PanelId = "frais" | "revenus" | "exposition" | "simulateur" | "abonnements" | "etf";

const MONTHS = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

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
          bientôt
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

function feeBadge(rate: number | null) {
  if (rate === null) return <Badge tone="warning">TER inconnu</Badge>;
  if (rate < 0.005) return <Badge tone="positive">Faible</Badge>;
  if (rate <= 0.01) return <Badge tone="warning">Moyen</Badge>;
  return <Badge tone="negative">Élevé</Badge>;
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
  onSelectIsin,
}: {
  fees: FeeAnalysisResult;
  onSelectIsin: (isin: string) => void;
}) {
  const loss20 = fees.projectedLossCents.find((p) => p.horizonYears === 20);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi
          label="Frais annuels"
          value={formatEurCents(fees.annualCostCents)}
          sub={fees.feeRate !== null ? formatPercent(fees.feeRate) : undefined}
        />
        <Kpi label="Transactions cumulées" value={formatEurCents(fees.transactionFeesCents)} />
      </div>
      <div className="rounded-lg border border-negative/25 bg-negative/5 p-4">
        <p className="text-sm text-text-secondary">Impact estimé sur 20 ans</p>
        <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-negative">
          −{formatEurCents(loss20?.lossCents ?? 0)}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          vs même portefeuille à 0,15 %/an — rendement actions 6,2 % avant frais.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border-cw">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
              <th className="px-3 py-2 font-medium">Titre</th>
              <th className="px-3 py-2 text-right font-medium">Valeur</th>
              <th className="px-3 py-2 text-right font-medium">TER</th>
              <th className="px-3 py-2 text-right font-medium">Coût/an</th>
            </tr>
          </thead>
          <tbody>
            {fees.lines.map((line) => (
              <tr
                key={line.positionId}
                className={cn(
                  "border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30",
                  line.isin && "cursor-pointer",
                )}
                onClick={() => line.isin && onSelectIsin(line.isin)}
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
                  Aucune position analysée.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Manque à gagner projeté</p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={fees.projectedLossCents.map((p) => ({ ...p, lossEur: p.lossCents / 100 }))}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="horizonYears"
                tickFormatter={(v: number) => `${v} ans`}
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
                formatter={(value) => [formatEurCents(Number(value) * 100), "Manque à gagner"]}
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
      <p className="text-xs text-text-muted">
        Frais d&apos;entrée SCPI et certains frais d&apos;assurance-vie ne sont pas modélisés.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Panneau revenus                                */
/* -------------------------------------------------------------------------- */

function IncomePanel({
  income,
  onSelectIsin,
}: {
  income: IncomeAnalysisResult;
  onSelectIsin: (isin: string) => void;
}) {
  const calendarData = income.monthlyCalendar.map((m) => ({
    label: `${MONTHS[m.month]} ${String(m.year).slice(2)}`,
    amountEur: m.amountCents / 100,
  }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi label="Cash 12 mois" value={formatEurCents(income.cashTwelveMonthsCents)} />
        <Kpi
          label="Projection 12 mois"
          value={formatEurCents(income.projectedTwelveMonthsCents)}
          sub="capitalisés inclus"
        />
      </div>
      {calendarData.length > 0 ? (
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">Calendrier des versements</p>
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
                  formatter={(value) => [formatEurCents(Number(value) * 100), "Reçu"]}
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
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">12 mois</th>
              <th className="px-3 py-2 text-right font-medium">Projection</th>
              <th className="px-3 py-2 text-right font-medium">Yield</th>
            </tr>
          </thead>
          <tbody>
            {income.lines.map((line) => (
              <tr
                key={`${line.positionId}-${line.kind}`}
                className={cn(
                  "border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30",
                  line.isin && "cursor-pointer",
                )}
                onClick={() => line.isin && onSelectIsin(line.isin)}
              >
                <td className="px-3 py-2 text-text-primary">{line.name}</td>
                <td className="px-3 py-2">
                  {line.kind === "cash" ? (
                    <Badge tone="positive">Cash</Badge>
                  ) : (
                    <Badge tone="neutral">Capitalisé</Badge>
                  )}
                </td>
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
                <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                  Aucun revenu détecté — importez un export broker.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted">
        Les dividendes capitalisés (ETF Acc) sont estimés via le yield 2025 du fichier ETF
        de référence, jamais versés en cash.
      </p>
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
  kind: "sector" | "region";
}) {
  const [open, setOpen] = useState<number | null>(null);
  const pieData = result.lines.slice(0, 8).map((line, index) => ({
    name: kind === "region"
      ? REGIONS.find((r) => r.key === line.sector)?.label ?? line.sector
      : line.sector,
    value: line.amountCents / 100,
    color: colorFor(index),
  }));
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Kpi
          label="Score"
          value={result.score !== null ? `${result.score}/10` : "—"}
          sub="concentration pénalisée"
        />
        {result.lines[0] ? (
          <Kpi
            label={kind === "sector" ? "Secteur n°1" : "Zone n°1"}
            value={
              kind === "sector"
                ? result.lines[0].sector
                : REGIONS.find((r) => r.key === result.lines[0].sector)?.label ??
                  result.lines[0].sector
            }
            sub={formatPercent(result.lines[0].share)}
          />
        ) : null}
      </div>
      {result.alerts.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-warning/25 bg-warning/5 p-3">
          {result.alerts.map((alert) => (
            <p key={alert.label} className="text-sm text-warning">
              ⚠ {alert.label} : {formatPercent(alert.share)} — via {alert.detail}
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
            kind === "region"
              ? `${REGIONS.find((r) => r.key === line.sector)?.flag ?? ""} ${
                  REGIONS.find((r) => r.key === line.sector)?.label ?? line.sector
                }`
              : line.sector;
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
            Exposition inconnue pour vos positions.
          </p>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">
        Look-through : ETF dépliés selon la répartition de leur indice de référence
        (approximations destinées à être remplacées par les holdings réelles).
      </p>
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

function SimulationPanel({ defaults }: { defaults: SimulatorDefaults }) {
  const saved = useMemo(() => {
    try {
      const raw = localStorage.getItem(SIM_STORAGE_KEY);
      return raw
        ? (JSON.parse(raw) as Partial<{
            horizonYears: number;
            withdrawalRate: number;
            equityReturn: number;
            extraSavings: number;
            useInflation: boolean;
            inflationRate: number;
          }>)
        : null;
    } catch {
      return null;
    }
  }, []);
  const [horizonYears, setHorizonYears] = useState(saved?.horizonYears ?? 20);
  const [withdrawalRate, setWithdrawalRate] = useState(saved?.withdrawalRate ?? 4);
  const [equityReturn, setEquityReturn] = useState(
    saved?.equityReturn ?? defaults.equityReturn * 100,
  );
  const [extraSavings, setExtraSavings] = useState(saved?.extraSavings ?? 0);
  const [useInflation, setUseInflation] = useState(saved?.useInflation ?? false);
  const [inflationRate, setInflationRate] = useState(saved?.inflationRate ?? 2);

  useEffect(() => {
    try {
      localStorage.setItem(
        SIM_STORAGE_KEY,
        JSON.stringify({
          horizonYears,
          withdrawalRate,
          equityReturn,
          extraSavings,
          useInflation,
          inflationRate,
        }),
      );
    } catch {
      // stockage indisponible : pas de persistance
    }
  }, [horizonYears, withdrawalRate, equityReturn, extraSavings, useInflation, inflationRate]);

  const simulation = useMemo(() => {
    const monthlyInvested = defaults.monthlyDcaCents + extraSavings;
    const monthlySavings = Math.max(
      0,
      defaults.monthlySavingsCents - defaults.monthlyDcaCents - extraSavings,
    );
    return simulateTwoTracks({
      investedWealthCents: defaults.investedWealthCents,
      savingsWealthCents: defaults.savingsWealthCents,
      monthlyInvestedCents: monthlyInvested,
      monthlySavingsCents: monthlySavings,
      equityReturn: equityReturn / 100,
      savingsReturn: defaults.savingsReturn,
      inflation: useInflation ? inflationRate / 100 : 0,
      horizonYears,
    });
  }, [defaults, horizonYears, equityReturn, extraSavings, useInflation, inflationRate]);

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
            Capital à l&apos;horizon ({finalPoint.year})
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-positive">
            {formatEurCents(finalPoint.totalCents)}
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-gold">
            <p>dont {formatEurCents(totalGainCents)} d&apos;intérêts</p>
            <p>{formatEurCents(totalContributionsCents)} d&apos;apports</p>
            {useInflation ? (
              <p>{formatEurCents(finalPoint.totalRealCents)} en euros constants</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-lg border border-accent-500/25 bg-gradient-to-br from-accent-500/10 to-transparent p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Rente mensuelle ({withdrawalRate.toFixed(2).replace(".", ",")} %/an)
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-accent-500">
            {formatEurCents(monthlyRenteCents)}/mois
          </p>
          <div className="mt-1 space-y-0.5 text-xs text-gold">
            <p>retrait de {formatPercent(withdrawalRate / 100)} du capital par an</p>
            {useInflation ? (
              <p>{formatEurCents(monthlyRenteRealCents)}/mois en euros constants</p>
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
              name="Investissement"
            />
            <Line
              type="monotone"
              dataKey="savingsEur"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
              name="Épargne"
            />
            {useInflation ? (
              <Line
                type="monotone"
                dataKey="totalRealEur"
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
                dot={false}
                name="Euros constants"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-4 rounded-lg border border-border-cw bg-bg-subtle/40 p-4">
        <Slider
          label="Horizon"
          value={horizonYears}
          min={5}
          max={40}
          step={5}
          onChange={setHorizonYears}
          format={(v) => `${v} ans`}
        />
        <Slider
          label="Taux de retrait (indépendance)"
          value={withdrawalRate}
          min={3}
          max={5}
          step={0.25}
          onChange={setWithdrawalRate}
          format={(v) => `${v.toFixed(2).replace(".", ",")} %`}
          hint="3,25 % = plus prudent, 4 % = règle classique"
        />
        <Slider
          label="Rendement actions"
          value={equityReturn}
          min={2}
          max={12}
          step={0.5}
          onChange={setEquityReturn}
          format={(v) => `${v.toFixed(1).replace(".", ",")} %/an`}
          hint={`défaut : ${formatPercent(defaults.equityReturn)} (${
            defaults.returnSource === "historique" ? "votre historique" : "moyenne actions"
          })`}
        />
        <Slider
          label="Épargne mensuelle supplémentaire"
          value={extraSavings}
          min={0}
          max={200000}
          step={5000}
          onChange={setExtraSavings}
          format={(v) => formatEurCents(v)}
          hint={`s'ajoute au DCA actuel (${formatEurCents(defaults.monthlyDcaCents)}/mois) et va à l'investissement`}
        />
        <div className="flex items-center justify-between">
          <label
            htmlFor="sim-inflation-toggle"
            className="text-sm font-medium text-text-secondary"
          >
            Prendre en compte l&apos;inflation
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
            label="Inflation moyenne par an"
            value={inflationRate}
            min={0}
            max={10}
            step={0.25}
            onChange={setInflationRate}
            format={(v) => `${v.toFixed(2).replace(".", ",")} %`}
            hint="moyenne historique euro : ~2 %/an"
          />
        ) : null}
      </div>
      <p className="text-xs text-text-muted">
        Investissement (actions/ETF) : composition au rendement choisi. Épargne (livrets) :
        taux contractuel {formatPercent(defaults.savingsReturn)}, versements réels de{" "}
        {formatEurCents(Math.max(0, defaults.monthlySavingsCents - defaults.monthlyDcaCents))}/mois.
        Le DCA actif va toujours à l&apos;investissement, jamais à l&apos;épargne.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*              Carte Simulateur (pleine largeur, graphique intégré)           */
/* -------------------------------------------------------------------------- */

function SimulatorCard({
  defaults,
  onClick,
}: {
  defaults: SimulatorDefaults;
  onClick: (id: PanelId) => void;
}) {
  const simulation = useMemo(
    () =>
      simulateTwoTracks({
        investedWealthCents: defaults.investedWealthCents,
        savingsWealthCents: defaults.savingsWealthCents,
        monthlyInvestedCents: defaults.monthlyDcaCents,
        monthlySavingsCents: Math.max(0, defaults.monthlySavingsCents - defaults.monthlyDcaCents),
        equityReturn: defaults.equityReturn,
        savingsReturn: defaults.savingsReturn,
        inflation: 0.02,
        horizonYears: 20,
      }),
    [defaults],
  );
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
              Simulateur de patrimoine
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              projection à 20 ans par défaut · rendement{" "}
              {formatPercent(defaults.equityReturn)} ({defaults.returnSource}) · DCA{" "}
              {formatEurCents(defaults.monthlyDcaCents)}/mois
            </p>
          </div>
        </div>
        <div className="flex items-end gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Capital projeté ({finalPoint.year})
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-positive">
              {formatEurCents(finalPoint.totalCents)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Rente 4 %/an
            </p>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-accent-500">
              {formatEurCents(Math.round((finalPoint.totalCents * 0.04) / 12))}/mois
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
              name="Investissement"
            />
            <Line
              type="monotone"
              dataKey="savingsEur"
              stroke="var(--info)"
              strokeWidth={2}
              dot={false}
              name="Épargne"
            />
            <Line
              type="monotone"
              dataKey="totalEur"
              stroke="var(--text-secondary)"
              strokeWidth={2.5}
              dot={false}
              name="Total"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="relative text-xs text-text-muted">
        Investissement {formatEurCents(defaults.investedWealthCents)} + épargne{" "}
        {formatEurCents(defaults.savingsWealthCents)} — cliquez pour simuler horizon,
        rendement et épargne.
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
  const disabled = sectors.lines.length === 0 && regions.lines.length === 0;
  const topRegion = regions.lines[0]
    ? REGIONS.find((r) => r.key === regions.lines[0].sector)
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
        Exposition
      </p>
      <div className="relative grid grid-cols-1 divide-y divide-border-cw sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="sm:pr-6 sm:border-0">
          <p className="font-heading text-base font-semibold text-text-primary">
            {topRegion?.flag ?? ""} {topRegion?.label ?? "Géographie"}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {regions.lines[0] ? formatPercent(regions.lines[0].share) : "—"}
          </p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-text-secondary uppercase">
            zone dominante · {regions.lines.length} zones
          </p>
        </div>
        <div className="sm:pl-6">
          <p className="font-heading text-base font-semibold text-text-primary">
            {sectors.lines[0]?.sector ?? "Secteurs"}
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {sectors.lines[0] ? formatPercent(sectors.lines[0].share) : "—"}
          </p>
          <p className="mt-0.5 text-xs font-medium tracking-wide text-text-secondary uppercase">
            secteur dominant · {sectors.lines.length} secteurs
          </p>
        </div>
      </div>
      <p className="relative text-xs text-text-muted">
        Répartition réelle ETF dépliés (look-through) — cliquez pour le détail
        sectoriel et géographique.
      </p>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                    Panneau Exposition (onglets secteur/géo)                  */
/* -------------------------------------------------------------------------- */

function ExposurePanel({
  sectors,
  regions,
}: {
  sectors: DiversificationResult;
  regions: DiversificationResult;
}) {
  const [tab, setTab] = useState<"sector" | "region">("region");
  const result = tab === "region" ? regions : sectors;
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
          Géographique
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
          Sectoriel
        </button>
      </div>
      <DiversificationPanel result={result} kind={tab} />
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
  simulatorDefaults,
  etfDetails,
}: {
  fees: FeeAnalysisResult;
  income: IncomeAnalysisResult;
  sectors: DiversificationResult;
  regions: DiversificationResult;
  simulatorDefaults: SimulatorDefaults;
  /** détails CSV par ISIN, pour le panneau latéral ETF */
  etfDetails: Record<string, EtfDetail>;
}) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [selectedIsin, setSelectedIsin] = useState<string | null>(null);
  const [previousPanel, setPreviousPanel] = useState<PanelId | null>(null);
  const open = (id: PanelId) => {
    setPreviousPanel(null);
    setOpenPanel(id);
  };
  const close = () => {
    setOpenPanel(null);
    setPreviousPanel(null);
  };
  const openEtf = (isin: string) => {
    setSelectedIsin(isin);
    setPreviousPanel((prev) => (prev === null ? openPanel : prev));
    setOpenPanel("etf");
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
      title: "Scanner de frais",
      subtitle: "Coût annuel de chaque ligne et impact projeté long terme",
      icon: <Receipt className="h-5 w-5" aria-hidden />,
    },
    revenus: {
      title: "Dividendes & intérêts",
      subtitle: "Dividendes versés en cash et rendements capitalisés (ETF Acc)",
      icon: <Coins className="h-5 w-5" aria-hidden />,
    },
    exposition: {
      title: "Exposition",
      subtitle: "Répartition sectorielle et géographique, ETF dépliés (look-through)",
      icon: <PieIcon className="h-5 w-5" aria-hidden />,
    },
    simulateur: {
      title: "Simulateur de patrimoine",
      subtitle: "Projection interactive, indépendance financière",
      icon: <TrendingUp className="h-5 w-5" aria-hidden />,
    },
    abonnements: {
      title: "Abonnements",
      subtitle: "Détection des paiements récurrents — bientôt",
      icon: <Wallet className="h-5 w-5" aria-hidden />,
    },
    etf: {
      title:
        selectedIsin
          ? (etfDetails[selectedIsin]?.trName ||
            etfDetails[selectedIsin]?.name ||
            selectedIsin)
          : "ETF",
      subtitle: selectedIsin !== null ? selectedIsin : undefined,
      icon: <PieIcon className="h-5 w-5" aria-hidden />,
    },
  };

  const loss20 = fees.projectedLossCents.find((p) => p.horizonYears === 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Analyse</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Vos portefeuilles passés au crible : frais, revenus, diversification, projection.
          Cliquez sur un scanner pour le détail.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScannerCard
          id="frais"
          title="Frais"
          icon={<Receipt className="h-5 w-5" aria-hidden />}
          gradient="bg-gradient-to-br from-negative/10 via-transparent to-transparent"
          badge={feeBadge(fees.feeRate)}
          kpi={fees.feeRate !== null ? formatPercent(fees.feeRate) : "—"}
          kpiLabel={fees.feeRate !== null ? `du patrimoine · ${formatEurCents(fees.annualCostCents)}/an` : "TER partiellement inconnu"}
          detail={
            <>
              {formatEurCents(fees.annualCostCents)} de frais annuels
              <br />
              −{formatEurCents(loss20?.lossCents ?? 0)} projetés sur 20 ans
            </>
          }
          onClick={open}
          disabled={fees.lines.length === 0}
        />
        <ScannerCard
          id="revenus"
          title="Dividendes & intérêts"
          icon={<Coins className="h-5 w-5" aria-hidden />}
          gradient="bg-gradient-to-br from-positive/10 via-transparent to-transparent"
          badge={<Badge tone="neutral">12 mois</Badge>}
          kpi={formatEurCents(income.cashTwelveMonthsCents)}
          kpiLabel="dividendes perçus sur 12 mois"
          detail={
            <>
              projection : {formatEurCents(income.projectedTwelveMonthsCents)}
              <br />
              yield pondéré {income.yieldOnValue !== null ? formatPercent(income.yieldOnValue) : "—"}
            </>
          }
          onClick={open}
          disabled={income.lines.length === 0}
        />
        <ScannerCard
          id="abonnements"
          title="Abonnements"
          icon={<Wallet className="h-5 w-5" aria-hidden />}
          gradient="bg-gradient-to-br from-transparent to-transparent"
          badge={<Badge tone="neutral">0 €/mois</Badge>}
          kpi="0,00 €"
          kpiLabel="par mois"
          detail="La détection des paiements récurrents arrive avec l'import des transactions carte."
          onClick={open}
          comingSoon
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
            Bientôt disponible
          </p>
          <p className="text-xs text-text-muted">
            Un nouvel onglet d&apos;analyse prendra place ici.
          </p>
        </div>
        <SimulatorCard defaults={simulatorDefaults} onClick={open} />
      </div>

      <SidePanel
        open={openPanel !== null}
        onClose={close}
        onBack={openPanel === "etf" && previousPanel !== null ? back : undefined}
        backLabel={
          openPanel === "etf" && previousPanel !== null
            ? `Retour — ${panels[previousPanel].title}`
            : undefined
        }
        title={openPanel !== null ? panels[openPanel].title : ""}
        subtitle={openPanel !== null ? panels[openPanel].subtitle : undefined}
        icon={openPanel !== null ? panels[openPanel].icon : undefined}
      >
        {openPanel === "frais" ? <FeePanel fees={fees} onSelectIsin={openEtf} /> : null}
        {openPanel === "revenus" ? (
          <IncomePanel income={income} onSelectIsin={openEtf} />
        ) : null}
        {openPanel === "exposition" ? (
          <ExposurePanel sectors={sectors} regions={regions} />
        ) : null}
        {openPanel === "simulateur" ? (
          <SimulationPanel defaults={simulatorDefaults} />
        ) : null}
        {openPanel === "etf" && selectedIsin && etfDetails[selectedIsin] ? (
          <EtfDetailPanel etf={etfDetails[selectedIsin]} />
        ) : null}
        {openPanel === "abonnements" ? (
          <p className="py-8 text-center text-sm text-text-muted">
            Le scanner d&apos;abonnements analyse les transactions carte (MCC) — disponible
            dès l&apos;import de ces opérations.
          </p>
        ) : null}
      </SidePanel>
    </div>
  );
}
