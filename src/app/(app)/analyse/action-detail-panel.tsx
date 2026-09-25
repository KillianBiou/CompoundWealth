"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, Globe2 } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/components/cn";
import { formatPercent } from "@/lib/money";
import type { ActionDetail } from "@/lib/analysis/action-detail";
import { useI18n } from "@/i18n/provider";
import type { Dictionary, Locale } from "@/i18n/server";
import { DataAsOfBadge } from "./data-as-of-badge";
import { HintLabel } from "./hint-label";
import { InfoRow } from "./info-row";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  CHF: "CHF",
  GBP: "£",
  JPY: "¥",
  KRW: "₩",
  CNY: "¥",
  HKD: "HK$",
  INR: "₹",
  SAR: "SAR",
  TWD: "NT$",
  SEK: "kr",
};

function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

function intlLocale(locale: Locale): string {
  return locale === "en" ? "en-US" : "fr-FR";
}

function sectorLabel(sector: string, t: Dictionary): string {
  const labels = t.analyse.detail.sectors as Record<string, string>;
  return labels[sector] ?? sector;
}

function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

/** market cap lisible : 5 422 Md$ / 289 MdCHF */
function formatMarketCap(marketCap: number, currency: string, locale: string): string {
  const symbol = currencySymbol(currency);
  if (marketCap >= 1_000_000_000_000) {
    return `${(marketCap / 1_000_000_000_000).toLocaleString(locale, { maximumFractionDigits: 2 })} Tn${symbol}`;
  }
  if (marketCap >= 1_000_000_000) {
    return `${(marketCap / 1_000_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} Md${symbol}`;
  }
  return `${(marketCap / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} M${symbol}`;
}

function formatVolume(volume: number, locale: string): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} M`;
  if (volume >= 1_000) return `${(volume / 1_000).toLocaleString(locale, { maximumFractionDigits: 1 })} k`;
  return formatNumber(volume, locale);
}

/* -------------------------------------------------------------------------- */
/*                            Cours de l'action                               */
/* -------------------------------------------------------------------------- */

interface PriceHistoryPoint {
  date: string;
  price: number;
}

function PriceChart({
  points,
  currency,
}: {
  points: PriceHistoryPoint[];
  currency: string;
}) {
  const { t, locale } = useI18n();
  const d = t.analyse.detail.action;
  const intl = intlLocale(locale);
  const data = points.map((p) => ({ date: p.date, price: p.price }));
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const positive = last >= first;
  return (
    <div className="rounded-lg border border-border-cw p-4">
      <div className="flex items-baseline justify-between">
        <HintLabel hint={d.priceHint} uppercase>
          {d.priceTitle}
        </HintLabel>
        <p
          className={cn(
            "text-xs font-semibold tabular-nums",
            positive ? "text-positive" : "text-negative",
          )}
        >
          {positive ? "+" : ""}
          {first > 0 ? formatPercent((last - first) / first) : "—"}
        </p>
      </div>
      <div className="mt-2 h-40" aria-label={d.priceChartAria}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="actionPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              type="category"
              tickFormatter={(v: string) =>
                new Date(v).toLocaleDateString(intl, { month: "short" })
              }
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `${formatNumber(v, intl)}`}
              stroke="var(--text-muted)"
              fontSize={11}
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
              labelFormatter={(label) =>
                new Date(String(label)).toLocaleDateString(intl, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value) => [
                `${formatNumber(Number(value), intl)} ${currencySymbol(currency)}`,
                d.priceSeries,
              ]}
            />
            <Area
              type="monotone"
              dataKey="price"
              name={d.priceSeries}
              stroke="var(--accent-500)"
              strokeWidth={2}
              fill="url(#actionPriceGradient)"
              dot={false}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            Panneau complet                                 */
/* -------------------------------------------------------------------------- */

export function ActionDetailPanel({
  action,
  priceHistory,
}: {
  action: ActionDetail;
  /** historique 6 mois préchargé côté serveur (peut être vide) */
  priceHistory: PriceHistoryPoint[];
}) {
  const { t, locale } = useI18n();
  const d = t.analyse.detail.action;
  const intl = intlLocale(locale);
  const [tab, setTab] = useState<"general" | "entreprise">("general");
  const symbol = currencySymbol(action.currency);
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/50 p-1">
        {(
          [
            { id: "general", label: t.analyse.detail.common.tabs.general },
            { id: "entreprise", label: t.analyse.detail.common.tabs.company },
          ] as const
        ).map(({ id, label }) => (
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
            {label}
          </button>
        ))}
      </div>
      {tab === "general" ? (
        <div className="space-y-5">
          <div className="rounded-lg border border-border-cw p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-heading text-base font-semibold text-text-primary">
                {action.longName || action.name}
              </p>
              {action.price !== null ? (
                <p className="font-heading text-lg font-semibold tabular-nums text-text-primary">
                  {formatNumber(action.price, intl)} {symbol}
                </p>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{sectorLabel(action.sector, t) || "—"}</Badge>
              {action.industry ? <Badge tone="neutral">{action.industry}</Badge> : null}
              <Badge tone="neutral">{action.exchange}</Badge>
            </div>
            <div className="mt-3">
              <DataAsOfBadge dataAsOf={action.dataAsOf} source="Yahoo Finance" />
            </div>
          </div>
          {priceHistory.length > 1 ? (
            <PriceChart points={priceHistory} currency={action.currency} />
          ) : null}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border-cw p-4">
              <HintLabel uppercase hint={d.marketCapHint}>
                {d.marketCap}
              </HintLabel>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
                {action.marketCap !== null
                  ? formatMarketCap(action.marketCap, action.currency, intl)
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{d.marketCapSub}</p>
            </div>
            <div className="rounded-lg border border-border-cw p-4">
              <HintLabel uppercase hint={d.peHint}>
                {d.peTitle}
              </HintLabel>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
                {action.trailingPe !== null
                  ? `${action.trailingPe.toLocaleString(intl, { maximumFractionDigits: 1 })}×`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {action.forwardPe !== null
                  ? d.peForward.replace(
                      "{value}",
                      action.forwardPe.toLocaleString(intl, { maximumFractionDigits: 1 }),
                    )
                  : d.peTrailingSub}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              {d.priceVolume}
            </p>
            <InfoRow
              label={d.volumeDay}
              value={action.volume !== null ? formatVolume(action.volume, intl) : "—"}
              hint={d.volumeDayHint}
            />
            <InfoRow
              label={d.volume3m}
              value={
                action.averageVolume3Month !== null
                  ? formatVolume(action.averageVolume3Month, intl)
                  : "—"
              }
              hint={d.volume3mHint}
            />
            <InfoRow
              label={d.high52}
              value={
                action.fiftyTwoWeekHigh !== null
                  ? `${formatNumber(action.fiftyTwoWeekHigh, intl)} ${symbol}`
                  : "—"
              }
              hint={d.high52Hint}
            />
            <InfoRow
              label={d.low52}
              value={
                action.fiftyTwoWeekLow !== null
                  ? `${formatNumber(action.fiftyTwoWeekLow, intl)} ${symbol}`
                  : "—"
              }
              hint={d.low52Hint}
            />
            <InfoRow
              label={d.ma50}
              value={
                action.fiftyDayAverage !== null
                  ? `${formatNumber(action.fiftyDayAverage, intl)} ${symbol}`
                  : "—"
              }
              hint={d.ma50Hint}
            />
            <InfoRow
              label={d.ma200}
              value={
                action.twoHundredDayAverage !== null
                  ? `${formatNumber(action.twoHundredDayAverage, intl)} ${symbol}`
                  : "—"
              }
              hint={d.ma200Hint}
            />
          </div>
          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              {d.dividendValuation}
            </p>
            <InfoRow
              label={d.dividendYield}
              value={action.dividendYield !== null ? formatPercent(action.dividendYield) : "—"}
              hint={d.dividendYieldHint}
            />
            <InfoRow
              label={d.dividendRate}
              value={
                action.dividendRate !== null
                  ? `${formatNumber(action.dividendRate, intl)} ${symbol}`
                  : "—"
              }
              hint={d.dividendRateHint}
            />
            <InfoRow
              label={d.payout}
              value={action.payoutRatio !== null ? formatPercent(action.payoutRatio) : "—"}
              hint={d.payoutHint}
            />
            <InfoRow
              label={d.priceToBook}
              value={
                action.priceToBook !== null
                  ? `${action.priceToBook.toLocaleString(intl, { maximumFractionDigits: 1 })}×`
                  : "—"
              }
              hint={d.priceToBookHint}
            />
            <InfoRow
              label={d.beta}
              value={
                action.beta !== null
                  ? action.beta.toLocaleString(intl, { maximumFractionDigits: 2 })
                  : "—"
              }
              hint={d.betaHint}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-lg border border-border-cw p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-subtle text-accent-500">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-heading text-base font-semibold text-text-primary">
                  {action.longName || action.name}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  {action.hqCity}
                  {action.hqState ? `, ${action.hqState}` : ""}
                  {action.country ? ` · ${action.country}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{sectorLabel(action.sector, t) || "—"}</Badge>
              {action.industry ? <Badge tone="neutral">{action.industry}</Badge> : null}
            </div>
          </div>
          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              {d.identity}
            </p>
            <InfoRow
              label={d.sector}
              value={sectorLabel(action.sector, t) || "—"}
              hint={d.sectorHint}
            />
            <InfoRow
              label={d.industry}
              value={action.industry || "—"}
              hint={d.industryHint}
            />
            <InfoRow
              label={d.employees}
              value={
                action.fullTimeEmployees !== null
                  ? action.fullTimeEmployees.toLocaleString(intl)
                  : "—"
              }
              hint={d.employeesHint}
            />
            <InfoRow
              label={d.listingCurrency}
              value={action.currency || "—"}
              hint={d.listingCurrencyHint}
            />
            {action.website ? (
              <div className="flex items-baseline justify-between gap-4 border-b border-border-cw/40 py-1.5 last:border-0">
                <span className="shrink-0 text-xs text-text-muted">{d.website}</span>
                <a
                  href={action.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-500 hover:underline"
                >
                  {action.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            ) : null}
          </div>
          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              {d.identifiers}
            </p>
            <InfoRow
              label="Ticker"
              value={action.ticker}
              hint={d.tickerHint}
            />
            <InfoRow
              label={t.analyse.detail.etf.yahoo}
              value={action.tickerYahoo}
              hint={d.yahooHint}
            />
            {action.isin ? (
              <InfoRow
                label="ISIN"
                value={action.isin}
                hint={d.isinHint}
              />
            ) : null}
            <InfoRow
              label={t.analyse.detail.etf.exchange}
              value={action.exchange || "—"}
              hint={d.exchangeHint}
            />
          </div>
          {action.businessSummary ? (
            <div className="rounded-lg border border-border-cw p-4">
              <div className="mb-1 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-text-muted" aria-hidden />
                <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
                  {d.businessSummary}
                </p>
              </div>
              <p className="text-sm leading-relaxed text-text-secondary">
                {action.businessSummary}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export type { PriceHistoryPoint };
