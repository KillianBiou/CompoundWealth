"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronDown,
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
import { useI18n } from "@/i18n/provider";

export type EnvelopeKind = "savings" | "equity";

export interface VisibleState {
  [id: string]: boolean;
}

type ViewMode = "detailed" | "grid" | "compact";

const viewModes: { key: ViewMode; icon: typeof List }[] = [
  { key: "detailed", icon: Rows3 },
  { key: "grid", icon: LayoutGrid },
  { key: "compact", icon: List },
];

const viewModeKeys: Record<ViewMode, "detailed" | "grid" | "compact"> = {
  detailed: "detailed",
  grid: "grid",
  compact: "compact",
};

const kindStyles: Record<
  EnvelopeKind,
  {
    /** bordures / accents */
    border: string;
    borderStrong: string;
    /** dégradé de fond : couleur visible aux bords, discrète au centre */
    panelBg: string;
    cardBg: string;
    text: string;
    toggleOn: string;
    toggleKnobOn: string;
  }
> = {
  savings: {
    border: "border-info/40",
    borderStrong: "border-info/60",
    panelBg:
      "[background:radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--info)_12%,var(--bg-elevated))_0%,color-mix(in_srgb,var(--info)_20%,var(--bg-elevated))_130%)]",
    cardBg:
      "bg-bg-elevated [background:radial-gradient(ellipse_at_center,var(--bg-elevated)_25%,color-mix(in_srgb,var(--info)_3%,var(--bg-elevated))_150%)]",
    text: "text-info",
    toggleOn: "border-info/50",
    toggleKnobOn: "bg-info",
  },
  equity: {
    border: "border-positive/40",
    borderStrong: "border-positive/60",
    panelBg:
      "[background:radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--positive)_12%,var(--bg-elevated))_0%,color-mix(in_srgb,var(--positive)_20%,var(--bg-elevated))_130%)]",
    cardBg:
      "bg-bg-elevated [background:radial-gradient(ellipse_at_center,var(--bg-elevated)_25%,color-mix(in_srgb,var(--positive)_3%,var(--bg-elevated))_150%)]",
    text: "text-positive",
    toggleOn: "border-positive/50",
    toggleKnobOn: "bg-positive",
  },
};

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
  const { t } = useI18n();
  const styles = kindStyles[kind];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={`${label} — ${t.dashboard.showInChart}`}
      title={t.dashboard.showInChart}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border bg-bg-subtle transition-colors",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        checked ? styles.toggleOn : "border-border-cw",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm transition-all",
          size === "sm" ? "h-3 w-3" : "h-4 w-4",
          checked
            ? cn(styles.toggleKnobOn, size === "sm" ? "left-[1.3rem]" : "left-[1.6rem]")
            : cn("bg-text-muted", size === "sm" ? "left-[0.2rem]" : "left-[0.25rem]"),
        )}
      />
    </button>
  );
}

function gainPill(
  gain: number | null,
  investedCents: number,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (gain === null) {
    return (
      <span className="text-sm italic text-text-muted">{t.dashboard.gainNotComputable}</span>
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
  const { t } = useI18n();
  if (!envelope.dcaMonthlyCents || envelope.dcaMonthlyCents <= 0) {
    return <span className="text-xs text-text-muted">{t.dashboard.dcaNone}</span>;
  }
  const payments = envelope.dcaMonthlyPayments ?? 0;
  return (
    <span className="text-xs text-text-secondary tabular-nums">
      {t.dashboard.dcaOneMonth}{" "}
      <span className="font-medium text-accent-500">
        {formatEurCents(envelope.dcaMonthlyCents)}
      </span>
      <span className="text-text-muted">
        {" "}
        {t.dashboard.dcaPayments
          .replace("{count}", String(payments))
          .replace("{s}", payments > 1 ? "s" : "")}
      </span>
    </span>
  );
}

function Sparkline({
  series,
  gainCents,
  className,
}: {
  series: { date: Date; valueCents: number }[];
  gainCents: number | null;
  className?: string;
}) {
  const { t } = useI18n();
  if (series.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-end text-[11px] text-text-muted",
          className,
        )}
      >
        {t.dashboard.historyBuilding}
      </div>
    );
  }
  const width = 320;
  const height = 48;
  const values = series.map((p) => p.valueCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 4 - ((value - min) / span) * (height - 8);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const positive = gainCents === null || gainCents >= 0;
  const stroke = positive ? "var(--positive)" : "var(--negative)";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-12", className)}
      role="img"
      aria-label={t.dashboard.recentChange}
      preserveAspectRatio="none"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TopPositionsInfo({ envelope }: { envelope: PanelEnvelope }) {
  const { t } = useI18n();
  if (envelope.topPositions.length === 0) return null;
  const top = envelope.topPositions[0];
  const rest = envelope.topPositions.length - 1;
  return (
    <p className="text-xs text-text-secondary tabular-nums">
      <span className="font-medium text-text-primary">
        {top.symbol ?? top.name}
      </span>{" "}
      {formatEurCentsCompact(top.valueCents)}
      {rest > 0 ? (
        <span className="text-text-muted"> {t.dashboard.otherPositions.replace("{count}", String(rest)).replace("{s}", rest > 1 ? "s" : "")}</span>
      ) : null}
    </p>
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
  topPositions: { name: string; symbol: string | null; valueCents: number }[];
}

function EnvelopeToggle({
  envelope,
  visible,
  onToggleEnvelope,
}: {
  envelope: PanelEnvelope;
  visible: boolean;
  onToggleEnvelope: (id: string) => void;
}) {
  return (
    <ToggleSwitch
      checked={visible}
      onToggle={() => onToggleEnvelope(envelope.id)}
      kind={envelope.kind}
      label={envelope.name}
    />
  );
}

function CompactEnvelope({
  envelope,
  visible,
  onToggleEnvelope,
}: {
  envelope: PanelEnvelope;
  visible: boolean;
  onToggleEnvelope: (id: string) => void;
}) {
  const { t } = useI18n();
  const styles = kindStyles[envelope.kind];
  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors",
        styles.border,
        styles.cardBg,
        visible ? "hover:border-info/60" : "opacity-60",
      )}
    >
      <Link href={`/envelopes/${envelope.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {envelope.kind === "savings" ? (
          <Landmark className="h-4 w-4 shrink-0 text-info" aria-hidden />
        ) : null}
        <p className="truncate text-sm font-medium text-text-primary group-hover:text-accent-500">
          {envelope.name}
        </p>
        <p className="shrink-0 text-xs text-text-muted">
          {envelope.type === "LIVRET_A"
          ? t.dashboard.envelopeType.LIVRET_A
          : envelope.type === "PRIV"
            ? t.dashboard.envelopeType.PRIV
            : envelope.type}
        </p>
      </Link>
      <div className="flex shrink-0 items-center gap-3 tabular-nums">
        <Link href={`/envelopes/${envelope.id}`} className="flex items-center gap-3">
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
        </Link>
        <EnvelopeToggle
          envelope={envelope}
          visible={visible}
          onToggleEnvelope={onToggleEnvelope}
        />
      </div>
    </div>
  );
}

function DetailedEnvelope({
  envelope,
  visible,
  onToggleEnvelope,
}: {
  envelope: PanelEnvelope;
  visible: boolean;
  onToggleEnvelope: (id: string) => void;
}) {
  const { t } = useI18n();
  const styles = kindStyles[envelope.kind];
  const isLivret = envelope.type === "LIVRET_A";
  return (
    <div
      className={cn(
        "group rounded-lg border p-5 transition-colors",
        styles.border,
        styles.cardBg,
        visible ? "" : "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Link href={`/envelopes/${envelope.id}`} className="group/link min-w-0 shrink-0 cursor-pointer">
          <div className="flex items-center gap-2">
            {envelope.kind === "savings" ? (
              <Landmark className="h-4 w-4 shrink-0 text-info" aria-hidden />
            ) : null}
            <p className="truncate font-medium text-text-primary group-hover/link:text-accent-500">
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
              {isLivret
              ? t.dashboard.envelopeType.LIVRET_A
              : envelope.type === "PRIV"
                ? t.dashboard.envelopeType.PRIV
                : envelope.type}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-text-muted">
            {envelope.broker ? `${envelope.broker} · ` : ""}
            {envelope.openedAt
              ? t.dashboard.openedOn.replace(
                  "{date}",
                  new Date(envelope.openedAt).toLocaleDateString("fr-FR", {
                    month: "short",
                    year: "numeric",
                  }),
                )
              : isLivret
                ? t.dashboard.precautionSavings
                : "—"}
          </p>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <Link
            href={`/envelopes/${envelope.id}`}
            className="min-w-0 flex-1 cursor-pointer sm:max-w-2xl"
          >
            <Sparkline
              series={envelope.sparkSeries}
              gainCents={envelope.gainCents}
              className="h-12 w-full"
            />
          </Link>
          <EnvelopeToggle
            envelope={envelope}
            visible={visible}
            onToggleEnvelope={onToggleEnvelope}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <Link href={`/envelopes/${envelope.id}`} className="cursor-pointer">
          <p className="font-heading text-3xl font-semibold tabular-nums text-text-primary">
            {formatEurCents(envelope.valueCents)}
          </p>
          <p className="mt-1.5">{gainPill(envelope.gainCents, envelope.investedCents, t)}</p>
        </Link>
        <div className="flex flex-col items-end gap-1.5 text-right">
          {isLivret ? (
            <>
              <p className="text-xs text-text-secondary tabular-nums">
                {t.dashboard.deposited}{" "}
                <span className="font-medium text-text-primary">
                  {formatEurCents(envelope.investedCents)}
                </span>
              </p>
              {envelope.overCapCents && envelope.overCapCents > 0 ? (
                <p className="text-xs text-negative tabular-nums">
                  {t.dashboard.aboveCap.replace("{amount}", formatEurCents(envelope.overCapCents))}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-xs text-text-secondary tabular-nums">
                {t.dashboard.positionsInvested.replace("{count}", String(envelope.positionsCount)).replace("{s}", envelope.positionsCount > 1 ? "s" : "")}{" "}
                <span className="font-medium text-text-primary">
                  {formatEurCents(envelope.investedCents)}
                </span>
              </p>
              <TopPositionsInfo envelope={envelope} />
            </>
          )}
          <DcaMonthlyInfo envelope={envelope} />
        </div>
      </div>
    </div>
  );
}

function SemiCompactEnvelope({
  envelope,
  visible,
  onToggleEnvelope,
}: {
  envelope: PanelEnvelope;
  visible: boolean;
  onToggleEnvelope: (id: string) => void;
}) {
  const { t } = useI18n();
  const styles = kindStyles[envelope.kind];
  const isLivret = envelope.type === "LIVRET_A";
  return (
    <div
      className={cn(
        "group flex h-full flex-col rounded-lg border p-4 transition-colors",
        styles.border,
        styles.cardBg,
        visible ? "" : "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/envelopes/${envelope.id}`} className="group/link min-w-0 flex-1 cursor-pointer">
          <p className="truncate font-medium text-text-primary group-hover/link:text-accent-500">
            {envelope.name}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {isLivret
              ? t.dashboard.envelopeType.LIVRET_A
              : envelope.type === "PRIV"
                ? t.dashboard.envelopeType.PRIV
                : envelope.type}
            {envelope.broker ? ` · ${envelope.broker}` : ""}
          </p>
        </Link>
        <EnvelopeToggle
          envelope={envelope}
          visible={visible}
          onToggleEnvelope={onToggleEnvelope}
        />
      </div>
      <Link href={`/envelopes/${envelope.id}`} className="mt-3 cursor-pointer">
        <p className="font-heading text-2xl font-semibold tabular-nums text-text-primary">
          {formatEurCents(envelope.valueCents)}
        </p>
        <p className="mt-1">{gainPill(envelope.gainCents, envelope.investedCents, t)}</p>
      </Link>
      <div className="mt-auto flex items-center justify-between border-t border-border-cw/60 pt-2.5">
        <p className="text-xs text-text-muted">
          {isLivret
            ? `${t.dashboard.deposited} ${formatEurCentsCompact(envelope.investedCents)}${
                envelope.overCapCents && envelope.overCapCents > 0
                  ? ` ${t.dashboard.offCap.replace("{amount}", formatEurCentsCompact(envelope.overCapCents))}`
                  : ""
              }`
            : `${t.dashboard.positionsInvested.replace("{count}", String(envelope.positionsCount)).replace("{s}", envelope.positionsCount > 1 ? "s" : "")} ${formatEurCentsCompact(envelope.investedCents)}`}
        </p>
        <DcaMonthlyInfo envelope={envelope} />
      </div>
    </div>
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
  {
    labelKey: "savingsLabel" | "equityLabel";
    descriptionKey: "savingsDesc" | "equityDesc";
  }
> = {
  savings: {
    labelKey: "savingsLabel",
    descriptionKey: "savingsDesc",
  },
  equity: {
    labelKey: "equityLabel",
    descriptionKey: "equityDesc",
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
  const { t } = useI18n();
  const [view, setView] = useState<ViewMode>("grid");
  const [collapsed, setCollapsed] = useState<Record<EnvelopeKind, boolean>>({
    savings: false,
    equity: false,
  });

  const categories = useMemo<CategoryData[]>(() => {
    const build = (kind: EnvelopeKind, list: EnvelopeSummary[]): CategoryData => {
      const meta = categoryMeta[kind];
      return {
      key: kind,
      label: t.dashboard.category[meta.labelKey],
      description: t.dashboard.category[meta.descriptionKey],
      envelopes: list.map((e) => ({
        id: e.id,
        name: e.name,
        kind,
        broker: e.broker,
        openedAt: e.openedAt,
        sparkSeries:
          e.type === "LIVRET_A" && e.livretSeries
            ? e.livretSeries.map((p) => ({ date: p.date, valueCents: p.balanceCents }))
            : e.series,
        valueCents: e.valueCents,
        gainCents: e.gainCents,
        investedCents: e.investedCents,
        positionsCount: e.positionsCount,
        dcaMonthlyCents: e.dcaMonthlyCents,
        dcaMonthlyPayments: e.dcaMonthlyPayments,
        overCapCents: e.overCapCents,
        type: e.type,
        topPositions: e.topPositions ?? [],
      })),
      totalValueCents: list.reduce((s, e) => s + e.valueCents, 0),
      };
    };
    return [
      build("savings", envelopes.filter((e) => e.type === "LIVRET_A")),
      build("equity", envelopes.filter((e) => e.type !== "LIVRET_A")),
    ].filter((c) => c.envelopes.length > 0);
  }, [envelopes, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">{t.dashboard.myEnvelopes}</h2>
        <div
          className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle p-1"
          role="group"
          aria-label={t.dashboard.viewMode}
        >
          {viewModes.map(({ key, icon: Icon }) => {
            const label = t.dashboard.layout[viewModeKeys[key]];
            return (
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
            );
          })}
        </div>
      </div>

      {categories.map((category) => {
        const allVisible =
          category.envelopes.length > 0 &&
          category.envelopes.every((e) => visible[e.id] ?? true);
        const isCollapsed = collapsed[category.key];
        const styles = kindStyles[category.key];
        return (
          <section
            key={category.key}
            className={cn(
              "overflow-hidden rounded-xl border",
              styles.border,
              styles.panelBg,
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-cw/40 px-5 py-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [category.key]: !prev[category.key],
                    }))
                  }
                  aria-expanded={!isCollapsed}
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 text-text-muted transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                    aria-hidden
                  />
                  <span className="font-heading text-base font-bold tracking-tight text-text-primary">
                    {category.label}
                  </span>
                </button>
                <span
                  className={cn(
                    "rounded-full bg-bg-subtle px-2.5 py-0.5 text-xs font-semibold tabular-nums",
                    styles.text,
                  )}
                >
                  {formatEurCents(category.totalValueCents)}
                </span>
                <span className="hidden text-xs text-text-muted lg:inline">
                  {category.description}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-text-muted">
                  {t.dashboard.envelopeCount.replace("{count}", String(category.envelopes.length)).replace("{s}", category.envelopes.length > 1 ? "s" : "")}
                </span>
                <ToggleSwitch
                  checked={allVisible}
                  onToggle={() => onToggleCategory(category.key)}
                  kind={category.key}
                  label={t.dashboard.wholeCategory.replace("{label}", category.label)}
                  size="md"
                />
              </div>
            </div>
            {!isCollapsed ? (
              <div className="space-y-3 p-4">
                {view === "compact" ? (
                  category.envelopes.map((envelope) => (
                    <CompactEnvelope
                      key={envelope.id}
                      envelope={envelope}
                      visible={visible[envelope.id] ?? true}
                      onToggleEnvelope={onToggleEnvelope}
                    />
                  ))
                ) : view === "detailed" ? (
                  category.envelopes.map((envelope) => (
                    <DetailedEnvelope
                      key={envelope.id}
                      envelope={envelope}
                      visible={visible[envelope.id] ?? true}
                      onToggleEnvelope={onToggleEnvelope}
                    />
                  ))
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {category.envelopes.map((envelope) => (
                      <SemiCompactEnvelope
                        key={envelope.id}
                        envelope={envelope}
                        visible={visible[envelope.id] ?? true}
                        onToggleEnvelope={onToggleEnvelope}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
