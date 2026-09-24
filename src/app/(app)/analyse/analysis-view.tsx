"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, Card, Kpi } from "@/components/ui";
import { cn } from "@/components/cn";
import { REGIONS } from "@/lib/analysis/exposure-catalog";
import type {
  DiversificationResult,
  FeeAnalysisResult,
  IncomeAnalysisResult,
  SimulationResult,
} from "@/lib/analysis/scanners";

/** Palette catégorielle 8 teintes (charte §6, même que DCA). */
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

function feeBadgeTone(rate: number | null): "positive" | "warning" | "negative" {
  if (rate === null) return "warning";
  if (rate < 0.005) return "positive";
  if (rate <= 0.01) return "warning";
  return "negative";
}

function feeBadgeLabel(rate: number | null): string {
  if (rate === null) return "TER inconnu";
  if (rate < 0.005) return "Faible";
  if (rate <= 0.01) return "Moyen";
  return "Élevé";
}

/* -------------------------------------------------------------------------- */
/*                                  Panneau frais                              */
/* -------------------------------------------------------------------------- */

export function FeePanel({ fees }: { fees: FeeAnalysisResult }) {
  const loss20 = fees.projectedLossCents.find((p) => p.horizonYears === 20);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Frais annuels totaux"
          value={formatEurCents(fees.annualCostCents)}
          sub={fees.feeRate !== null ? `${formatPercent(fees.feeRate)} du patrimoine` : undefined}
        />
        <Kpi
          label="Frais de transaction cumulés"
          value={formatEurCents(fees.transactionFeesCents)}
        />
        <Kpi
          label="Manque à gagner 20 ans"
          value={formatEurCents(loss20?.lossCents ?? 0)}
          sub="vs frais à 0,15 %/an"
          subTone="negative"
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Coût annuel par ligne</h3>
        <div className="overflow-x-auto rounded-lg border border-border-cw">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
                <th className="px-3 py-2 font-medium">Titre</th>
                <th className="px-3 py-2 font-medium">Enveloppe</th>
                <th className="px-3 py-2 text-right font-medium">Valeur</th>
                <th className="px-3 py-2 text-right font-medium">TER</th>
                <th className="px-3 py-2 text-right font-medium">Coût annuel</th>
              </tr>
            </thead>
            <tbody>
              {fees.lines.map((line) => (
                <tr
                  key={line.positionId}
                  className="border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30"
                >
                  <td className="px-3 py-2 text-text-primary">
                    {line.name}
                    {line.isin ? (
                      <span className="ml-1 text-xs text-text-muted">{line.isin}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{line.envelopeName}</td>
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
                  <td colSpan={5} className="px-3 py-6 text-center text-text-muted">
                    Aucune position analysée — importez un portefeuille ou ajoutez des positions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">
          Projection du manque à gagner (frais actuels vs 0,15 %)
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fees.projectedLossCents.map((p) => ({ ...p, lossEur: p.lossCents / 100 }))}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="horizonYears"
                tickFormatter={(v: number) => `${v} ans`}
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
                cursor={{ fill: "var(--bg-subtle)" }}
                contentStyle={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [formatEurCents(Number(value) * 100), "Manque à gagner"]}
              />
              <Bar dataKey="lossEur" fill="var(--negative)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Frais d&apos;entrée SCPI et certains frais d&apos;assurance-vie ne sont pas modélisés. Les
        projections supposent un rendement actions de 6,2 %/an avant frais.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Panneau revenus                                */
/* -------------------------------------------------------------------------- */

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function IncomePanel({ income }: { income: IncomeAnalysisResult }) {
  const calendarData = income.monthlyCalendar.map((m) => ({
    label: `${MONTHS[m.month]} ${String(m.year).slice(2)}`,
    amountEur: m.amountCents / 100,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Revenus cash 12 mois"
          value={formatEurCents(income.cashTwelveMonthsCents)}
        />
        <Kpi
          label="Estimation 12 prochains mois"
          value={formatEurCents(income.projectedTwelveMonthsCents)}
          sub="dividendes capitalisés inclus"
        />
        <Kpi
          label="Yield pondéré"
          value={income.yieldOnValue !== null ? formatPercent(income.yieldOnValue) : "—"}
          sub="sur la valeur actuelle"
        />
      </div>
      {calendarData.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-medium text-text-secondary">Calendrier des versements</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={calendarData}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(v: number) => `${v} €`}
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
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
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Par source</h3>
        <div className="overflow-x-auto rounded-lg border border-border-cw">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">12 derniers mois</th>
                <th className="px-3 py-2 text-right font-medium">12 prochains (est.)</th>
                <th className="px-3 py-2 text-right font-medium">Yield</th>
              </tr>
            </thead>
            <tbody>
              {income.lines.map((line) => (
                <tr
                  key={`${line.positionId}-${line.kind}`}
                  className="border-b border-border-cw/50 last:border-0 hover:bg-bg-subtle/30"
                >
                  <td className="px-3 py-2 text-text-primary">{line.name}</td>
                  <td className="px-3 py-2">
                    {line.kind === "cash" ? (
                      <Badge tone="positive">Cash</Badge>
                    ) : (
                      <Badge tone="neutral">Capitalisé (est.)</Badge>
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
                    Aucun revenu détecté — les dividendes apparaissent après un import broker.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-muted">
          Pour un portefeuille 100 % ETF Acc : les dividendes capitalisés sont estimés via le
          yield de l&apos;indice de référence (look-through), ils ne sont pas versés en cash.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Panneau diversification (secteur/géo)                 */
/* -------------------------------------------------------------------------- */

export function DiversificationPanel({
  result,
  kind,
}: {
  result: DiversificationResult;
  kind: "sector" | "region";
}) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const toggle = (index: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const barMax = result.lines[0]?.amountCents ?? 1;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label="Score de diversification"
          value={result.score !== null ? `${result.score}/10` : "—"}
          sub="pénalise la concentration (Herfindahl)"
        />
        {result.lines[0] ? (
          <Kpi
            label={kind === "sector" ? "Secteur dominant" : "Zone dominante"}
            value={
              kind === "sector"
                ? result.lines[0].sector
                : REGIONS.find((r) => r.key === result.lines[0].sector)?.label ?? result.lines[0].sector
            }
            sub={formatPercent(result.lines[0].share)}
          />
        ) : null}
        <Kpi label="Valeur analysée" value={formatEurCents(result.totalCents)} />
      </div>
      {result.alerts.length > 0 ? (
        <div className="space-y-1.5 rounded-lg border border-warning/25 bg-warning/5 p-3">
          {result.alerts.map((alert) => (
            <p key={alert.label} className="text-sm text-warning">
              ⚠ {alert.label} : {formatPercent(alert.share)} — via {alert.detail}
            </p>
          ))}
        </div>
      ) : null}
      <div className="space-y-2">
        {result.lines.map((line, index) => {
          const isHidden = hidden.has(index);
          return (
            <div key={line.sector}>
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between text-left text-sm"
                aria-expanded={!isHidden}
              >
                <span className="flex items-center gap-2 text-text-primary">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorFor(index) }}
                    aria-hidden
                  />
                  {kind === "region"
                    ? `${REGIONS.find((r) => r.key === line.sector)?.flag ?? ""} ${
                        REGIONS.find((r) => r.key === line.sector)?.label ?? line.sector
                      }`
                    : line.sector}
                </span>
                <span className="tabular-nums text-text-secondary">
                  {formatEurCents(line.amountCents)} · {formatPercent(line.share)}
                </span>
              </button>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(line.amountCents / barMax) * 100}%`,
                    backgroundColor: colorFor(index),
                  }}
                />
              </div>
              {isHidden ? null : (
                <p className="mt-1 pl-4 text-xs text-text-muted">
                  {line.contributors
                    .slice(0, 4)
                    .map(
                      (c) =>
                        `${c.name} (${formatEurCents(c.amountCents)})`,
                    )
                    .join(" · ")}
                  {line.contributors.length > 4 ? " …" : ""}
                </p>
              )}
            </div>
          );
        })}
        {result.lines.length === 0 ? (
          <p className="py-6 text-center text-text-muted">
            Exposition inconnue pour vos positions — l&apos;enrichissement des ETF (panier,
            secteurs, régions) est en cours de connexion.
          </p>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">
        Look-through : les ETF sont dépliés selon la répartition de leur indice de référence.
        Les poids sont des approximations destinées à être remplacées par les holdings réelles.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Simulateur                                     */
/* -------------------------------------------------------------------------- */

export function SimulationPanel({
  simulation,
  totalWealthCents,
  monthlySavingsCents,
  monthlyExpensesCents,
}: {
  simulation: SimulationResult;
  totalWealthCents: number;
  monthlySavingsCents: number | null;
  monthlyExpensesCents: number | null;
}) {
  const chartData = simulation.points.map((p) => ({
    year: p.year,
    nominalEur: p.nominalCents / 100,
    realEur: p.realCents / 100,
  }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi
          label={`Patrimoine projeté ${simulation.points[simulation.points.length - 1].year}`}
          value={formatEurCents(simulation.finalNominalCents)}
          sub={`${formatEurCents(simulation.finalRealCents)} en euros constants`}
        />
        <Kpi
          label="Indépendance financière (règle 4 %)"
          value={simulation.fireYear !== null ? String(simulation.fireYear) : "Au-delà de l'horizon"}
          sub={
            monthlyExpensesCents !== null
              ? `cible : ${formatEurCents(monthlyExpensesCents * 12 * 25)}`
              : "renseignez votre salaire dans les réglages"
          }
        />
        <Kpi
          label="Épargne mensuelle (12 mois glissants)"
          value={monthlySavingsCents !== null ? formatEurCents(monthlySavingsCents) : "—"}
          sub="issue de vos versements réels"
        />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">
          Projection nominale vs euros constants (5 %/an, inflation 2 %)
        </h3>
        <div className="h-56">
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
                formatter={(value, name) => [
                  formatEurCents(Number(value) * 100),
                  name === "nominalEur" ? "Nominal" : "Euros constants",
                ]}
              />
              <Line
                type="monotone"
                dataKey="nominalEur"
                stroke="var(--positive)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="realEur"
                stroke="var(--info)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">Jalons de capital</h3>
        <div className="flex flex-wrap gap-2">
          {simulation.milestones.map((m) => (
            <Badge key={m.label} tone={m.year !== null ? "positive" : "neutral"}>
              {m.label} — {m.year !== null ? m.year : "au-delà de l'horizon"}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium text-text-secondary">
          Sensibilité : capital final selon rendement × épargne
        </h3>
        <div className="overflow-x-auto rounded-lg border border-border-cw">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-cw bg-bg-subtle/50 text-left text-xs text-text-secondary">
                <th className="px-3 py-2 font-medium">Rendement</th>
                <th className="px-3 py-2 text-right font-medium">Épargne ÷2</th>
                <th className="px-3 py-2 text-right font-medium">Épargne actuelle</th>
                <th className="px-3 py-2 text-right font-medium">Épargne ×1,5</th>
              </tr>
            </thead>
            <tbody>
              {[0.03, 0.05, 0.08].map((rate) => {
                const row = simulation.sensitivity.filter((s) => s.annualReturn === rate);
                return (
                  <tr key={rate} className="border-b border-border-cw/50 last:border-0">
                    <td className="px-3 py-2 text-text-primary">{formatPercent(rate)}</td>
                    {row.map((cell) => (
                      <td
                        key={`${cell.annualReturn}-${cell.monthlySavingsCents}`}
                        className="px-3 py-2 text-right tabular-nums text-text-secondary"
                      >
                        {formatEurCents(cell.finalCents)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Base : {formatEurCents(totalWealthCents)} de patrimoine actuel, horizon 20 ans,
        retraits au taux de 4 %. Rendements avant fiscalité — la flat tax s&apos;applique au retrait.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Vue par panneaux                                 */
/* -------------------------------------------------------------------------- */

type PanelId = "frais" | "revenus" | "secteurs" | "geo" | "simulateur" | "abonnements";

const PANEL_TITLES: Record<PanelId, { title: string; subtitle: string }> = {
  frais: {
    title: "Scanner de frais",
    subtitle: "Coût annuel de chaque ligne et impact projeté long terme",
  },
  revenus: {
    title: "Revenus passifs",
    subtitle: "Dividendes, intérêts et distributions — reçus et estimés",
  },
  secteurs: {
    title: "Diversification sectorielle",
    subtitle: "Répartition réelle par secteur, ETF dépliés (look-through)",
  },
  geo: {
    title: "Diversification géographique",
    subtitle: "Exposition par pays et zone, ETF dépliés (look-through)",
  },
  simulateur: {
    title: "Simulateur de patrimoine",
    subtitle: "Projection long terme, indépendance financière et sensibilité",
  },
  abonnements: {
    title: "Abonnements",
    subtitle: "Détection des paiements récurrents — bientôt disponible",
  },
};

export function AnalysisPageView({
  fees,
  income,
  sectors,
  regions,
  simulation,
  totalWealthCents,
  monthlySavingsCents,
  monthlyExpensesCents,
}: {
  fees: FeeAnalysisResult;
  income: IncomeAnalysisResult;
  sectors: DiversificationResult;
  regions: DiversificationResult;
  simulation: SimulationResult;
  totalWealthCents: number;
  monthlySavingsCents: number | null;
  monthlyExpensesCents: number | null;
}) {
  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Analyse</h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Vos portefeuilles passés au crible : frais, revenus, diversification, projection.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ScannerCard
          id="frais"
          title="Frais"
          badge={
            <Badge tone={feeBadgeTone(fees.feeRate)}>
              {feeBadgeLabel(fees.feeRate)}
            </Badge>
          }
          kpi={formatEurCents(fees.annualCostCents)}
          kpiLabel="frais annuels"
          detail={
            fees.feeRate !== null
              ? `${formatPercent(fees.feeRate)} du patrimoine · ${
                  fees.projectedLossCents.find((p) => p.horizonYears === 20)
                    ? formatEurCents(fees.projectedLossCents.find((p) => p.horizonYears === 20)!.lossCents)
                    : ""
                } de manque à gagner sur 20 ans`
              : "TER inconnu pour certaines lignes"
          }
          disabled={fees.lines.length === 0}
          onOpen={setOpenPanel}
        />
        <ScannerCard
          id="revenus"
          title="Revenus passifs"
          badge={<Badge tone="neutral">12 mois</Badge>}
          kpi={formatEurCents(income.cashTwelveMonthsCents)}
          kpiLabel="perçus sur 12 mois"
          detail={`estimation 12 prochains mois : ${formatEurCents(
            income.projectedTwelveMonthsCents,
          )}${income.capitalizedTwelveMonthsCents > 0 ? " (capitalisés inclus)" : ""}`}
          disabled={income.lines.length === 0}
          onOpen={setOpenPanel}
        />
        <ScannerCard
          id="secteurs"
          title="Secteurs"
          badge={
            sectors.score !== null ? (
              <Badge tone={sectors.score >= 6 ? "positive" : sectors.score >= 4 ? "warning" : "negative"}>
                {sectors.score}/10
              </Badge>
            ) : (
              <Badge tone="neutral">—</Badge>
            )
          }
          kpi={sectors.lines[0] ? sectors.lines[0].sector : "—"}
          kpiLabel="secteur dominant"
          detail={
            sectors.lines[0]
              ? `${formatPercent(sectors.lines[0].share)} · ${sectors.lines.length} secteurs`
              : "exposition à enrichir"
          }
          disabled={sectors.lines.length === 0}
          onOpen={setOpenPanel}
        />
        <ScannerCard
          id="geo"
          title="Géographie"
          badge={
            regions.score !== null ? (
              <Badge tone={regions.score >= 6 ? "positive" : regions.score >= 4 ? "warning" : "negative"}>
                {regions.score}/10
              </Badge>
            ) : (
              <Badge tone="neutral">—</Badge>
            )
          }
          kpi={
            regions.lines[0]
              ? REGIONS.find((r) => r.key === regions.lines[0].sector)?.flag ?? "—"
              : "—"
          }
          kpiLabel={
            regions.lines[0]
              ? REGIONS.find((r) => r.key === regions.lines[0].sector)?.label ?? ""
              : "zone dominante"
          }
          detail={
            regions.lines[0]
              ? `${formatPercent(regions.lines[0].share)} · ${regions.lines.length} zones`
              : "exposition à enrichir"
          }
          disabled={regions.lines.length === 0}
          onOpen={setOpenPanel}
        />
        <ScannerCard
          id="simulateur"
          title="Simulateur"
          badge={<Badge tone="neutral">règle 4 %</Badge>}
          kpi={formatEurCents(simulation.finalNominalCents)}
          kpiLabel={`projeté ${simulation.points[simulation.points.length - 1].year}`}
          detail={
            simulation.fireYear !== null
              ? `indépendance financière en ${simulation.fireYear}`
              : "indépendance au-delà de l'horizon 20 ans"
          }
          disabled={simulation.points.length <= 1}
          onOpen={setOpenPanel}
        />
        <ScannerCard
          id="abonnements"
          title="Abonnements"
          badge={<Badge tone="neutral">bientôt</Badge>}
          kpi="0,00 €"
          kpiLabel="par mois"
          detail="La détection des paiements récurrents arrive avec l'import des transactions carte."
          disabled
          comingSoon
        />
      </div>

      {openPanel !== null ? (
        <Card className="animate-in fade-in slide-in-from-right-4">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                {PANEL_TITLES[openPanel].title}
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">{PANEL_TITLES[openPanel].subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenPanel(null)}
              className="rounded-lg border border-border-cw px-2 py-1 text-xs text-text-secondary transition-colors hover:border-accent-500/50 hover:text-text-primary"
              aria-label="Fermer le panneau"
            >
              Fermer ✕
            </button>
          </div>
          {openPanel === "frais" ? <FeePanel fees={fees} /> : null}
          {openPanel === "revenus" ? <IncomePanel income={income} /> : null}
          {openPanel === "secteurs" ? <DiversificationPanel result={sectors} kind="sector" /> : null}
          {openPanel === "geo" ? <DiversificationPanel result={regions} kind="region" /> : null}
          {openPanel === "simulateur" ? (
            <SimulationPanel
              simulation={simulation}
              totalWealthCents={totalWealthCents}
              monthlySavingsCents={monthlySavingsCents}
              monthlyExpensesCents={monthlyExpensesCents}
            />
          ) : null}
          {openPanel === "abonnements" ? (
            <p className="py-8 text-center text-sm text-text-muted">
              Le scanner d&apos;abonnements analyse les transactions carte (MCC) — disponible
              dès l&apos;import de ces opérations.
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}

function ScannerCard({
  id,
  title,
  badge,
  kpi,
  kpiLabel,
  detail,
  disabled,
  comingSoon,
  onOpen,
}: {
  id: PanelId;
  title: string;
  badge: React.ReactNode;
  kpi: string;
  kpiLabel: string;
  detail: string;
  disabled?: boolean;
  comingSoon?: boolean;
  onOpen?: (id: PanelId) => void;
}) {
  const isOpenable = !disabled && !comingSoon;
  return (
    <button
      type="button"
      disabled={!isOpenable}
      onClick={() => onOpen?.(id)}
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-border-cw bg-bg-elevated p-5 text-left transition-all",
        isOpenable
          ? "cursor-pointer hover:border-accent-500/50 hover:shadow-lg"
          : "cursor-default opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-heading text-base font-semibold text-text-primary">{title}</span>
        {badge}
      </div>
      <p className="font-heading text-2xl font-semibold tabular-nums text-text-primary">{kpi}</p>
      <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">{kpiLabel}</p>
      <p className="text-xs text-text-muted">{detail}</p>
    </button>
  );
}
