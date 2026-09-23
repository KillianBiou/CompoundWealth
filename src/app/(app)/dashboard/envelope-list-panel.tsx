"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Landmark,
  LayoutGrid,
  List,
  Rows3,
} from "lucide-react";
import type { EnvelopeSummary } from "@/server/queries";
import {
  formatEurCents,
  formatEurCentsCompact,
  formatPercent,
} from "@/lib/money";
import { cn } from "@/components/cn";
import { Sparkline } from "@/components/envelope-card";

export type EnvelopeKind = "savings" | "equity";

export interface VisibleState {
  [id: string]: boolean;
}

type ViewMode = "detailed" | "grid" | "compact";

const viewModes: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: "detailed", label: "Détaillée", icon: Rows3 },
  { key: "grid", label: "Semi-compacte", icon: LayoutGrid },
  { key: "compact", label: "Compacte", icon: List },
];

function ToggleSwitch({
  checked,
  onToggle,
  kind,
  label,
  size = "sm",
}: {
  checked: boolean;
  onToggle: () => void;
  kind: EnvelopeKind;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} — afficher dans le graphique`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        checked
          ? kind === "savings"
            ? "border-info/60 bg-info/25"
            : "border-positive/60 bg-positive/25"
          : "border-border-cw bg-bg-subtle",
      )}
    >
      <span
        className={cn(
          "absolute rounded-full shadow-sm transition-all",
          size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5",
          checked
            ? kind === "savings"
              ? "left-[calc(100%-1.05rem)] bg-info"
              : "left-[calc(100%-1.05rem)] bg-positive"
            : "left-1 bg-text-muted",
          size === "sm" && (checked ? "left-[1.15rem]" : "left-[0.2rem]"),
          size === "md" && (checked ? "left-[1.5rem]" : "left-[0.25rem]"),
        )}
      />
    </button>
  );
}

function gainPill(gain: number | null, investedCents: number) {
  if (gain === null) {
    return (
      <span className="text-sm italic text-text-muted">Gain non calculable</span>
    );
  }
  const ratio = investedCents > 0 ? gain / investedCents : null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums",
        gain >= 0 ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative",
      )}
    >
      {gain >= 0 ? "↗" : "↘"} {formatEurCents(Math.abs(gain))}
      {ratio !== null ? (
        <span className="font-normal opacity-80">({formatPercent(ratio)})</span>
      ) : null}
    </span>
  );
}

function DcaMonthlyInfo({ envelope }: { envelope: PanelEnvelope }) {
  if (!envelope.dcaMonthlyCents || envelope.dcaMonthlyCents <= 0) {
    return <span className="text-xs text-text-muted">DCA : aucun</span>;
  }
  return (
    <span className="text-xs text-text-secondary tabular-nums">
      DCA 1 mois :{" "}
      <span className="font-medium text-accent-500">
        {formatEurCents(envelope.dcaMonthlyCents)}
      </span>
      <span className="text-text-muted">
        {" "}
        · {envelope.dcaMonthlyPayments ?? 0} versement
        {(envelope.dcaMonthlyPayments ?? 0) > 1 ? "s" : ""}
      </span>
    </span>
  );
}

interface PanelEnvelope {
  id: string;
  name: string;
  kind: EnvelopeKind;
  broker: string | null;
  openedAt: Date | null;
  sparkSeries: { date: Date; valueCents: number }[];
  valueCents: number;
  gainCents: number | null;
  investedCents: number;
  positionsCount: number;
  dcaMonthlyCents?: number;
  dcaMonthlyPayments?: number;
  overCapCents?: number;
  type: EnvelopeSummary["type"];
}

function CompactEnvelope({
  envelope,
}: {
  envelope: PanelEnvelope;
}) {
  return (
    <Link
      href={`/envelopes/${envelope.id}`}
      className={cn(
        "group flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-4 py-2.5 transition-colors",
        envelope.kind === "savings"
          ? "border-info/25 bg-info/5 hover:border-info/50"
          : "border-positive/25 bg-positive/5 hover:border-positive/50",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {envelope.kind === "savings" ? (
          <Landmark className="h-4 w-4 shrink-0 text-info" aria-hidden />
        ) : null}
        <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent-500">
          {envelope.name}
        </p>
        <p className="shrink-0 text-xs text-text-muted">{envelope.type}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3 tabular-nums">
        <span className="text-sm font-semibold text-text-primary">
          {formatEurCentsCompact(envelope.valueCents)}
        </span>
        {envelope.gainCents !== null ? (
          <span
            className={cn(
              "text-sm font-medium",
              envelope.gainCents >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {envelope.gainCents >= 0 ? "+" : "−"}
            {formatEurCentsCompact(Math.abs(envelope.gainCents))}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function DetailedEnvelope({
  envelope,
}: {
  envelope: PanelEnvelope;
}) {
  const isLivret = envelope.type === "LIVRET_A";
  return (
    <Link
      href={`/envelopes/${envelope.id}`}
      className={cn(
        "group block cursor-pointer rounded-lg border p-5 transition-colors",
        envelope.kind === "savings"
          ? "border-info/30 bg-info/5 hover:border-info/60"
          : "border-positive/30 bg-positive/5 hover:border-positive/60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {envelope.kind === "savings" ? (
              <Landmark className="h-4 w-4 shrink-0 text-info" aria-hidden />
            ) : null}
            <p className="truncate font-medium text-text-primary group-hover:text-accent-500">
              {envelope.name}
            </p>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                envelope.kind === "savings"
                  ? "border-info/40 text-info"
                  : "border-positive/40 text-positive",
              )}
            >
              {isLivret ? "Livret A" : envelope.type}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {envelope.broker ? `${envelope.broker} · ` : ""}
            {envelope.openedAt
              ? `ouvert le ${new Date(envelope.openedAt).toLocaleDateString("fr-FR", {
                  month: "short",
                  year: "numeric",
                })}`
              : isLivret
                ? "épargne de précaution"
                : "—"}
          </p>
        </div>
        <div className="shrink-0">
          <Sparkline series={envelope.sparkSeries} gainCents={envelope.gainCents} />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-heading text-3xl font-semibold tabular-nums text-text-primary">
            {formatEurCents(envelope.valueCents)}
          </p>
          <p className="mt-1.5">{gainPill(envelope.gainCents, envelope.investedCents)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          {isLivret ? (
            <>
              <p className="text-xs text-text-secondary tabular-nums">
                Versé <span className="font-medium text-text-primary">{formatEurCents(envelope.investedCents)}</span>
              </p>
              {envelope.overCapCents && envelope.overCapCents > 0 ? (
                <p className="text-xs text-negative tabular-nums">
                  ⚠ {formatEurCents(envelope.overCapCents)} au-dessus du plafond
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-text-secondary tabular-nums">
              {envelope.positionsCount} position{envelope.positionsCount > 1 ? "s" : ""} · investi{" "}
              <span className="font-medium text-text-primary">
                {formatEurCents(envelope.investedCents)}
              </span>
            </p>
          )}
          <DcaMonthlyInfo envelope={envelope} />
        </div>
      </div>
    </Link>
  );
}

interface CategoryData {
  key: EnvelopeKind;
  label: string;
  description: string;
  envelopes: PanelEnvelope[];
  totalValueCents: number;
}

const categoryMeta: Record<
  EnvelopeKind,
  { label: string; description: string }
> = {
  savings: {
    label: "Épargne",
    description: "Livrets et fonds euros — capital stable, rendement faible",
  },
  equity: {
    label: "Investissement",
    description: "PEA et CTO — actions et ETF, croissance long terme",
  },
};

export function EnvelopeListPanel({
  envelopes,
  visible,
  onToggleEnvelope,
  onToggleCategory,
}: {
  envelopes: EnvelopeSummary[];
  visible: VisibleState;
  onToggleEnvelope: (id: string) => void;
  onToggleCategory: (kind: EnvelopeKind, next?: boolean) => void;
}) {
  const [view, setView] = useState<ViewMode>("grid");
  const [collapsed, setCollapsed] = useState<Record<EnvelopeKind, boolean>>({
    savings: false,
    equity: false,
  });

  const categories = useMemo<CategoryData[]>(() => {
    const build = (kind: EnvelopeKind, list: EnvelopeSummary[]): CategoryData => ({
      key: kind,
      ...categoryMeta[kind],
      envelopes: list.map((e) => ({
        id: e.id,
        name: e.name,
        kind,
        broker: e.broker,
        openedAt: e.openedAt,
        sparkSeries:
          e.type === "LIVRET_A" && e.livretSeries
            ? e.livretSeries
                .filter((p) => p.date.getTime() <= Date.now())
                .map((p) => ({ date: p.date, valueCents: p.balanceCents }))
            : e.series,
        valueCents: e.valueCents,
        gainCents: e.gainCents,
        investedCents: e.investedCents,
        positionsCount: e.positionsCount,
        dcaMonthlyCents: e.dcaMonthlyCents,
        dcaMonthlyPayments: e.dcaMonthlyPayments,
        overCapCents: e.overCapCents,
        type: e.type,
      })),
      totalValueCents: list.reduce((s, e) => s + e.valueCents, 0),
    });
    return [
      build(
        "savings",
        envelopes.filter((e) => e.type === "LIVRET_A"),
      ),
      build(
        "equity",
        envelopes.filter((e) => e.type !== "LIVRET_A"),
      ),
    ].filter((c) => c.envelopes.length > 0);
  }, [envelopes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">Mes enveloppes</h2>
        <div
          className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle p-1"
          role="group"
          aria-label="Disposition des enveloppes"
        >
          {viewModes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              aria-pressed={view === key}
              title={label}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                view === key
                  ? "bg-accent-500 text-white"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {categories.map((category) => {
        const allVisible =
          category.envelopes.length > 0 &&
          category.envelopes.every((e) => visible[e.id]);
        const isCollapsed = collapsed[category.key];
        return (
          <section key={category.key} className="space-y-3">
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5",
                category.key === "savings" ? "border-info/30 bg-info/10" : "border-positive/30 bg-positive/10",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [category.key]: !prev[category.key],
                    }))
                  }
                  aria-expanded={!isCollapsed}
                  className="flex cursor-pointer items-center gap-2 text-text-primary"
                >
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-text-muted transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                    aria-hidden
                  />
                  <span className="font-heading text-sm font-semibold">
                    {category.label}
                  </span>
                </button>
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    category.key === "savings" ? "text-info" : "text-positive",
                  )}
                >
                  {category.envelopes.length} enveloppe
                  {category.envelopes.length > 1 ? "s" : ""}
                  {" · "}
                  {formatEurCents(category.totalValueCents)}
                </span>
                <span className="hidden text-xs text-text-muted md:inline">
                  {category.description}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {allVisible ? (
                  <Eye className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-text-muted" aria-hidden />
                )}
                <ToggleSwitch
                  checked={allVisible}
                  onToggle={() => onToggleCategory(category.key)}
                  kind={category.key}
                  label={`${category.label} — catégorie entière`}
                  size="md"
                />
              </div>
            </div>

            {!isCollapsed ? (
              view === "compact" ? (
                <div className="space-y-2">
                  {category.envelopes.map((envelope) => (
                    <div key={envelope.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <CompactEnvelope envelope={envelope} />
                      </div>
                      <ToggleSwitch
                        checked={visible[envelope.id] ?? true}
                        onToggle={() => onToggleEnvelope(envelope.id)}
                        kind={envelope.kind}
                        label={envelope.name}
                      />
                    </div>
                  ))}
                </div>
              ) : view === "detailed" ? (
                <div className="space-y-3">
                  {category.envelopes.map((envelope) => (
                    <div key={envelope.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <DetailedEnvelope envelope={envelope} />
                      </div>
                      <ToggleSwitch
                        checked={visible[envelope.id] ?? true}
                        onToggle={() => onToggleEnvelope(envelope.id)}
                        kind={envelope.kind}
                        label={envelope.name}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {category.envelopes.map((envelope) => (
                    <div
                      key={envelope.id}
                      className="flex flex-col gap-2 sm:flex-col-reverse"
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-text-muted">
                          Dans le graphique
                        </span>
                        <ToggleSwitch
                          checked={visible[envelope.id] ?? true}
                          onToggle={() => onToggleEnvelope(envelope.id)}
                          kind={envelope.kind}
                          label={envelope.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <SemiCompactEnvelope envelope={envelope} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function SemiCompactEnvelope({
  envelope,
}: {
  envelope: PanelEnvelope;
}) {
  const isLivret = envelope.type === "LIVRET_A";
  return (
    <Link
      href={`/envelopes/${envelope.id}`}
      className={cn(
        "group block h-full cursor-pointer rounded-lg border p-4 transition-colors",
        envelope.kind === "savings"
          ? "border-info/25 bg-info/5 hover:border-info/50"
          : "border-positive/25 bg-positive/5 hover:border-positive/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-text-primary group-hover:text-accent-500">
            {envelope.name}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {isLivret ? "Livret A" : envelope.type}
            {envelope.broker ? ` · ${envelope.broker}` : ""}
          </p>
        </div>
        <div className="shrink-0">
          <Sparkline series={envelope.sparkSeries} gainCents={envelope.gainCents} />
        </div>
      </div>
      <div className="mt-3">
        <p className="font-heading text-2xl font-semibold tabular-nums text-text-primary">
          {formatEurCents(envelope.valueCents)}
        </p>
        <p className="mt-1">{gainPill(envelope.gainCents, envelope.investedCents)}</p>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border-cw/60 pt-2.5">
        <p className="text-xs text-text-muted">
          {isLivret
            ? `Versé ${formatEurCentsCompact(envelope.investedCents)}${
                envelope.overCapCents && envelope.overCapCents > 0
                  ? ` · ⚠ ${formatEurCentsCompact(envelope.overCapCents)} hors plafond`
                  : ""
              }`
            : `${envelope.positionsCount} position${envelope.positionsCount > 1 ? "s" : ""} · investi ${formatEurCentsCompact(envelope.investedCents)}`}
        </p>
        <DcaMonthlyInfo envelope={envelope} />
      </div>
    </Link>
  );
}
