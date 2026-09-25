"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/components/cn";
import { formatPercent } from "@/lib/money";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import { useI18n } from "@/i18n/provider";
import type { Dictionary } from "@/i18n/server";
import { HintLabel } from "./hint-label";
import { InfoRow } from "./info-row";
import { DataAsOfBadge } from "./data-as-of-badge";

/**
 * Panneau latéral de détail d'un ETF : onglets Général (identité, frais,
 * identifiants), Détails (valeurs détenues) et Diversification (pays et
 * secteurs, top 4 + « autres » dépliables).
 */

const PANEL_COLORS = [
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
  return PANEL_COLORS[index % PANEL_COLORS.length];
}

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸",
  "Japan": "🇯🇵",
  "United Kingdom": "🇬🇧",
  "Canada": "🇨🇦",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Switzerland": "🇨🇭",
  "Netherlands": "🇳🇱",
  "Luxembourg": "🇱🇺",
  "Ireland": "🇮🇪",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Sweden": "🇸🇪",
  "Australia": "🇦🇺",
  "Denmark": "🇩🇰",
  "China": "🇨🇳",
  "India": "🇮🇳",
  "Taiwan": "🇹🇼",
  "South Korea": "🇰🇷",
  "Brazil": "🇧🇷",
  "Other": "🌍",
};

function countryLabel(country: string, t: Dictionary): string {
  const labels = t.analyse.detail.countries as Record<string, string>;
  return labels[country] ?? country;
}

function sectorLabel(sector: string, t: Dictionary): string {
  const labels = t.analyse.detail.sectors as Record<string, string>;
  return labels[sector] ?? sector;
}

function flagFor(country: string): string {
  return COUNTRY_FLAGS[country] ?? "🏳️";
}



/* -------------------------------------------------------------------------- */
/*                                Onglet Général                              */
/* -------------------------------------------------------------------------- */



function GeneralTab({ etf }: { etf: EtfDetail }) {
  const { t } = useI18n();
  const d = t.analyse.detail.etf;
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border-cw p-4">
        <p className="font-heading text-base font-semibold text-text-primary">
          {etf.trName || etf.name}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={etf.distributing ? "positive" : "neutral"}>
            {etf.distributing ? d.distributing : d.accumulating}
          </Badge>
          <Badge tone="neutral">{etf.replication || "—"}</Badge>
          {etf.peaEligible ? <Badge tone="positive">PEA</Badge> : null}
          {etf.userHolding ? <Badge tone="warning">USER HOLDING</Badge> : null}
        </div>
        <div className="mt-3">
          <DataAsOfBadge
            dataAsOf={etf.dataAsOf}
            source={
              etf.assetClass === "Private Equity"
                ? d.sourcePe
                : d.sourceEtf
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border-cw p-4">
          <HintLabel hint={d.terHint} uppercase>
            {d.terTitle}
          </HintLabel>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {etf.ter !== null ? formatPercent(etf.ter) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">{d.terSub}</p>
        </div>
        <div className="rounded-lg border border-border-cw p-4">
          <HintLabel hint={d.yieldHint} uppercase>
            {d.yieldTitle}
          </HintLabel>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {etf.dividendYield2025 ? formatPercent(etf.dividendYield2025) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {etf.distributing ? d.yieldSubDist : d.yieldSubAcc}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border-cw p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
          {d.identity}
        </p>
        <InfoRow
          label={d.provider}
          value={etf.provider || etf.emitter}
          hint={d.providerHint}
        />
        <InfoRow
          label={d.indexTracked}
          value={etf.indexTracked}
          hint={d.indexHint}
        />
        <InfoRow
          label={d.assetClass}
          value={etf.assetClass}
          hint={d.assetClassHint}
        />
        <InfoRow
          label={d.region}
          value={etf.region}
          hint={d.regionHint}
        />
        <InfoRow
          label={d.sectorFocus}
          value={etf.sectorFocus}
          hint={d.sectorFocusHint}
        />
      </div>

      <div className="rounded-lg border border-border-cw p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
          {d.identifiers}
        </p>
        <InfoRow
          label="ISIN"
          value={etf.isin}
          hint={d.isinHint}
        />
        <InfoRow
          label="Ticker"
          value={etf.ticker}
          hint={d.tickerHint}
        />
        {etf.tickerYahoo ? <InfoRow
          label={d.yahoo}
          value={etf.tickerYahoo}
          hint={d.yahooHint}
        /> : null}
        {etf.wkn ? <InfoRow
          label={d.wkn}
          value={etf.wkn}
          hint={d.wknHint}
        /> : null}
        <InfoRow
          label={d.fundCurrency}
          value={etf.fundCurrency || etf.currency}
          hint={d.fundCurrencyHint}
        />
        {etf.currencyRisk ? <InfoRow
          label={d.currencyRisk}
          value={etf.currencyRisk}
          hint={d.currencyRiskHint}
        /> : null}
      </div>

      <div className="rounded-lg border border-border-cw p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
          {d.structure}
        </p>
        <InfoRow
          label={d.domicile}
          value={etf.domicile}
          hint={d.domicileHint}
        />
        <InfoRow
          label={d.exchange}
          value={etf.exchange}
          hint={d.exchangeHint}
        />
        <InfoRow
          label={d.holdingsCount}
          value={etf.holdingsCount ? etf.holdingsCount.toLocaleString("fr-FR") : "—"}
          hint={d.holdingsCountHint}
        />
        {etf.holdingsAsOf ? <InfoRow
          label={d.holdingsAsOf}
          value={etf.holdingsAsOf}
          hint={d.holdingsAsOfHint}
        /> : null}
      </div>
      {etf.notes ? (
        <div className="rounded-lg border border-border-cw p-4">
          <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
            {d.notes}
          </p>
          <ul className="space-y-1.5 text-xs text-text-secondary">
            {etf.notes.split("; ").map((note) =>
              note.trim() ? <li key={note}>· {note.trim()}</li> : null,
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Onglet Détails                              */
/* -------------------------------------------------------------------------- */

const HOLDINGS_PAGE_SIZE = 10;

function DetailsTab({ etf }: { etf: EtfDetail }) {
  const { t } = useI18n();
  const d = t.analyse.detail.etf;
  const holdings = etf.topHoldings;
  const [visibleCount, setVisibleCount] = useState(HOLDINGS_PAGE_SIZE);
  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        {d.holdingsEmpty}
      </p>
    );
  }
  const visible = holdings.slice(0, visibleCount);
  const visibleWeight = visible.reduce((sum, h) => sum + h.weight, 0);
  const remaining = holdings.length - visible.length;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border-cw p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
            {d.topHoldings.replace("{count}", String(visible.length))}
          </p>
          <p className="text-xs text-text-muted tabular-nums">
            {d.cumulatedWeight.replace("{weight}", formatPercent(visibleWeight))}
          </p>
        </div>
        <div className="mt-3 space-y-2.5">
          {visible.map((holding, index) => (
            <div key={holding.name}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-text-primary">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorFor(index) }}
                    aria-hidden
                  />
                  {holding.name}
                </span>
                <span className="tabular-nums text-text-secondary">
                  {formatPercent(holding.weight)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(holding.weight / holdings[0].weight) * 100}%`,
                    backgroundColor: colorFor(index),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        {remaining > 0 ? (
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + HOLDINGS_PAGE_SIZE)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-border-cw/60 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {d.showMore
              .replace("{count}", String(Math.min(HOLDINGS_PAGE_SIZE, remaining)))
              .replace("{s}", remaining > 1 ? "s" : "")}
          </button>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">
        {d.holdingsDisclaimer.replace("{count}", etf.holdingsCount ? etf.holdingsCount.toLocaleString("fr-FR") : "n")}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Onglet Diversification                          */
/* -------------------------------------------------------------------------- */

function BreakdownList({
  entries,
  flag,
  translate,
}: {
  entries: { name: string; weight: number }[];
  flag?: (label: string) => string;
  translate?: (label: string) => string;
}) {
  const { t } = useI18n();
  const c = t.analyse.detail.common;
  const [expanded, setExpanded] = useState(false);
  if (entries.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-text-muted">
        {t.analyse.detail.etf.breakdownUnavailable}
      </p>
    );
  }
  const named = entries.filter((e) => e.name !== "Other");
  const other = entries.find((e) => e.name === "Other");
  const visibleNamed = expanded ? named : named.slice(0, 4);
  const hiddenNamed = expanded ? [] : named.slice(4);
  const collapsedOtherWeight =
    (other?.weight ?? 0) + hiddenNamed.reduce((s, e) => s + e.weight, 0);
  const max = entries[0]?.weight || 1;
  return (
    <div className="space-y-2">
      {visibleNamed.map((entry, index) => {
        const label = translate ? translate(entry.name) : entry.name;
        return (
          <div key={entry.name}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-text-primary">
                {flag ? <span aria-hidden>{flag(entry.name)}</span> : (
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: colorFor(index) }}
                    aria-hidden
                  />
                )}
                {label}
              </span>
              <span className="tabular-nums text-text-secondary">
                {formatPercent(entry.weight)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(entry.weight / max) * 100}%`,
                  backgroundColor: colorFor(index),
                }}
              />
            </div>
          </div>
        );
      })}
      {!expanded && hiddenNamed.length > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 flex w-full items-center justify-between rounded-md border-t border-border-cw/40 px-1 pt-2 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
        >
          <span className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            <span aria-hidden>🌍</span>
            {c.other}
            {hiddenNamed.length > 0 ? (
              <span className="text-xs text-text-muted">
                {c.linesCount.replace("{count}", String(hiddenNamed.length))}
              </span>
            ) : null}
          </span>
          <span className="tabular-nums">+{formatPercent(collapsedOtherWeight)}</span>
        </button>
      ) : null}
      {expanded && named.length > 4 ? (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          {c.collapse}
        </button>
      ) : null}
      {(expanded || hiddenNamed.length === 0) && other ? (
        <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-border-cw/40 pt-2 text-sm">
          <span className="flex items-center gap-2 text-text-muted">
            <span aria-hidden>🌍</span>
            Autres
          </span>
          <span className="tabular-nums text-text-muted">
            {formatPercent(other.weight)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function DiversificationTab({ etf }: { etf: EtfDetail }) {
  const { t } = useI18n();
  const d = t.analyse.detail.etf;
  const hasData = etf.countries.length > 0 || etf.sectors.length > 0;
  return (
    <div className="space-y-5">
      {hasData ? (
        <>
          <div className="rounded-lg border border-border-cw p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <HintLabel hint={d.countriesHint} uppercase>
                {d.countriesTitle}
              </HintLabel>
              {etf.holdingsAsOf ? (
                <p className="text-xs text-text-muted">{d.asOf.replace("{date}", etf.holdingsAsOf)}</p>
              ) : null}
            </div>
            <BreakdownList
              entries={etf.countries}
              flag={flagFor}
              translate={(label) => countryLabel(label, t)}
            />
          </div>
          <div className="rounded-lg border border-border-cw p-4">
            <HintLabel
              className="mb-3"
              hint={d.sectorsHint}
              uppercase
            >
              {d.sectorsTitle}
            </HintLabel>
            <BreakdownList entries={etf.sectors} translate={(label) => sectorLabel(label, t)} />
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-text-muted">
          {t.analyse.detail.etf.breakdownEmpty}
        </p>
      )}
      <p className="text-xs text-text-muted">
        {t.analyse.detail.etf.breakdownDisclaimer}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Panneau complet                            */
/* -------------------------------------------------------------------------- */

type TabId = "general" | "details" | "diversification";

const TAB_IDS: TabId[] = ["general", "details", "diversification"];

export function EtfDetailPanel({ etf }: { etf: EtfDetail }) {
  const { t } = useI18n();
  const tabLabels = t.analyse.detail.common.tabs;
  const [tab, setTab] = useState<TabId>("general");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/50 p-1">
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-md px-2 py-2 text-sm font-medium transition-all",
              tab === id
                ? "bg-accent-500/15 text-accent-500"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {id === "general"
              ? tabLabels.general
              : id === "details"
                ? tabLabels.details
                : tabLabels.diversification}
          </button>
        ))}
      </div>
      {tab === "general" ? <GeneralTab etf={etf} /> : null}
      {tab === "details" ? <DetailsTab etf={etf} /> : null}
      {tab === "diversification" ? <DiversificationTab etf={etf} /> : null}
    </div>
  );
}
