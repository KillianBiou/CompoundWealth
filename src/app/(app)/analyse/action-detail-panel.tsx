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
import { DataAsOfBadge } from "./data-as-of-badge";
import { HintLabel } from "./hint-label";
import { InfoRow } from "./info-row";

const SECTOR_LABELS_FR: Record<string, string> = {
  Technology: "Technologie",
  "Communication Services": "Services de communication",
  "Consumer Cyclical": "Consommation discrétionnaire",
  "Consumer Defensive": "Consommation de base",
  Financials: "Finance",
  Healthcare: "Santé",
  Industrials: "Industrie",
  Energy: "Énergie",
  Utilities: "Services publics",
  "Real Estate": "Immobilier",
  "Basic Materials": "Matériaux de base",
};

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

function sectorFr(sector: string): string {
  return SECTOR_LABELS_FR[sector] ?? sector;
}

function formatNumberFr(value: number): string {
  return value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** market cap lisible : 5 422 Md$ / 289 MdCHF */
function formatMarketCap(marketCap: number, currency: string): string {
  const symbol = currencySymbol(currency);
  if (marketCap >= 1_000_000_000_000) {
    return `${(marketCap / 1_000_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} Tn${symbol}`;
  }
  if (marketCap >= 1_000_000_000) {
    return `${(marketCap / 1_000_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Md${symbol}`;
  }
  return `${(marketCap / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M${symbol}`;
}

function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M`;
  if (volume >= 1_000) return `${(volume / 1_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k`;
  return formatNumberFr(volume);
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
  const data = points.map((p) => ({ date: p.date, price: p.price }));
  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const positive = last >= first;
  return (
    <div className="rounded-lg border border-border-cw p-4">
      <div className="flex items-baseline justify-between">
        <HintLabel
          hint="Clôture quotidienne du cours (source Yahoo Finance), échantillonnée sur environ 80 points. Le pourcentage compare le premier et le dernier point de la période."
          uppercase
        >
          Cours 6 derniers mois
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
      <div className="mt-2 h-40" aria-label="Évolution du cours sur 6 mois">
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
                new Date(v).toLocaleDateString("fr-FR", { month: "short" })
              }
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={["auto", "auto"]}
              tickFormatter={(v: number) => `${formatNumberFr(v)}`}
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
                new Date(String(label)).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              }
              formatter={(value) => [
                `${formatNumberFr(Number(value))} ${currencySymbol(currency)}`,
                "Cours",
              ]}
            />
            <Area
              type="monotone"
              dataKey="price"
              name="Cours"
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
  const [tab, setTab] = useState<"general" | "entreprise">("general");
  const symbol = currencySymbol(action.currency);
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/50 p-1">
        {(
          [
            { id: "general", label: "Général" },
            { id: "entreprise", label: "Entreprise" },
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
                  {formatNumberFr(action.price)} {symbol}
                </p>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone="neutral">{sectorFr(action.sector) || "—"}</Badge>
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
              <HintLabel
                uppercase
                hint="Valeur de marché totale de l'entreprise : cours × nombre d'actions en circulation. Au-delà de 200 Md$ on parle de mega-cap (Apple, Microsoft...)."
              >
                Capitalisation
              </HintLabel>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
                {action.marketCap !== null
                  ? formatMarketCap(action.marketCap, action.currency)
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">valeur de marché totale</p>
            </div>
            <div className="rounded-lg border border-border-cw p-4">
              <HintLabel
                uppercase
                hint="Ratio P/E : cours divisé par le bénéfice par action sur 12 mois glissants. Autour de 15-20× en moyenne historique pour le marché américain. Un ratio élevé traduit une forte croissance attendue (ou une action chère)."
              >
                Cours / bénéfice
              </HintLabel>
              <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
                {action.trailingPe !== null
                  ? `${action.trailingPe.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×`
                  : "—"}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                {action.forwardPe !== null
                  ? `estimé : ${action.forwardPe.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×`
                  : "bénéfices 12 mois glissants"}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              Cours & volumes
            </p>
            <InfoRow
              label="Volume du jour"
              value={action.volume !== null ? formatVolume(action.volume) : "—"}
              hint="Nombre d'actions échangées aujourd'hui. Un volume élevé signifie une liquidité forte : vous achetez/vendez sans déplacer le prix."
            />
            <InfoRow
              label="Volume moyen 3 mois"
              value={
                action.averageVolume3Month !== null
                  ? formatVolume(action.averageVolume3Month)
                  : "—"
              }
              hint="Moyenne quotidienne des échanges sur 3 mois : plus fiable que le volume du jour pour juger la liquidité structurelle du titre."
            />
            <InfoRow
              label="Plus haut 52 semaines"
              value={
                action.fiftyTwoWeekHigh !== null
                  ? `${formatNumberFr(action.fiftyTwoWeekHigh)} ${symbol}`
                  : "—"
              }
              hint="Cours le plus élevé sur l'année écoulée. Servir de résistance psychologique : s'en approcher peut déclencher des prises de bénéfices."
            />
            <InfoRow
              label="Plus bas 52 semaines"
              value={
                action.fiftyTwoWeekLow !== null
                  ? `${formatNumberFr(action.fiftyTwoWeekLow)} ${symbol}`
                  : "—"
              }
              hint="Cours le plus bas sur l'année écoulée. Proche du plus bas = potentiellement décotée, mais souvent pour une raison (détérioration des bénéfices)."
            />
            <InfoRow
              label="Moyenne 50 jours"
              value={
                action.fiftyDayAverage !== null
                  ? `${formatNumberFr(action.fiftyDayAverage)} ${symbol}`
                  : "—"
              }
              hint="Moyenne mobile des 50 dernières séances (~2,5 mois) : indicateur de tendance court terme. Cours au-dessus = dynamique positive récente."
            />
            <InfoRow
              label="Moyenne 200 jours"
              value={
                action.twoHundredDayAverage !== null
                  ? `${formatNumberFr(action.twoHundredDayAverage)} ${symbol}`
                  : "—"
              }
              hint="Moyenne mobile des 200 dernières séances (~10 mois) : référence long terme des investisseurs institutionnels. Cours au-dessus = tendance de fond haussière."
            />
          </div>

          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              Dividende & valorisation
            </p>
            <InfoRow
              label="Rendement du dividende"
              value={action.dividendYield !== null ? formatPercent(action.dividendYield) : "—"}
              hint="Dividende annuel ÷ cours actuel. C'est le revenu cash que l'action distribue chaque année, en pourcentage de votre investissement. 2 à 4 % est courant pour une entreprise mature."
            />
            <InfoRow
              label="Dividende annuel"
              value={
                action.dividendRate !== null
                  ? `${formatNumberFr(action.dividendRate)} ${symbol}`
                  : "—"
              }
              hint="Montant total distribué par action sur 12 mois glissants. Une entreprise qui l'augmente régulièrement signale des bénéfices récurrents."
            />
            <InfoRow
              label="Taux de distribution"
              value={action.payoutRatio !== null ? formatPercent(action.payoutRatio) : "—"}
              hint="Part du bénéfice net distribuée en dividendes. < 60 % est soutenable (l'entreprise garde de quoi investir) ; > 100 % est un signal d'alerte (elle paie plus qu'elle ne gagne)."
            />
            <InfoRow
              label="Cours / actif net"
              value={
                action.priceToBook !== null
                  ? `${action.priceToBook.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}×`
                  : "—"
              }
              hint="Capitalisation boursière ÷ valeur comptable des actifs. Utile pour les banques/industries : < 1 signifie que le marché valorise l'entreprise moins que ses actifs nets."
            />
            <InfoRow
              label="Beta (volatilité)"
              value={
                action.beta !== null
                  ? action.beta.toLocaleString("fr-FR", { maximumFractionDigits: 2 })
                  : "—"
              }
              hint="Sensibilité du titre au marché : 1 = amplifie le marché, 1 = varie comme lui, < 1 = plus stable que le marché, > 2 = très nerveux. Un beta de 2 signifie ±2 % quand le marché bouge de ±1 %."
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
              <Badge tone="neutral">{sectorFr(action.sector) || "—"}</Badge>
              {action.industry ? <Badge tone="neutral">{action.industry}</Badge> : null}
            </div>
          </div>

          <div className="rounded-lg border border-border-cw p-4">
            <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
              Identité
            </p>
            <InfoRow
              label="Secteur"
              value={sectorFr(action.sector) || "—"}
              hint="Grande famille économique (Technologie, Santé, Énergie…). Diversifier entre secteurs réduit le risque conjoncturel : chaque secteur réagit différemment au cycle économique."
            />
            <InfoRow
              label="Industrie"
              value={action.industry || "—"}
              hint="Sous-segment précis du secteur (ex. Semiconductors dans Technologie). Deux entreprises d'un même secteur peuvent avoir des dynamiques très différentes selon leur industrie."
            />
            <InfoRow
              label="Employés"
              value={
                action.fullTimeEmployees !== null
                  ? action.fullTimeEmployees.toLocaleString("fr-FR")
                  : "—"
              }
              hint="Effectif à temps plein. Donne l'échelle de l'entreprise : le chiffre d'affaires par employé (CA ÷ effectif) est un bon indicateur de productivité."
            />
            <InfoRow
              label="Devise de cotation"
              value={action.currency || "—"}
              hint="Devise dans laquelle le titre est coté. Si elle diffère de l'EUR (USD, CHF…), votre rendement réel inclut la variation de change entre l'achat et la revente."
            />
            {action.website ? (
              <div className="flex items-baseline justify-between gap-4 border-b border-border-cw/40 py-1.5 last:border-0">
                <span className="shrink-0 text-xs text-text-muted">Site web</span>
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
              Identifiants
            </p>
            <InfoRow
              label="Ticker"
              value={action.ticker}
              hint="Symbole court de cotation (ex. NVDA). Attention aux collisions : deux entreprises peuvent partager un ticker sur des places différentes."
            />
            <InfoRow
              label="Symbole Yahoo"
              value={action.tickerYahoo}
              hint="Symbole utilisé pour récupérer les cours en temps réel via Yahoo Finance (suffixé par la place : .PA = Paris, .SW = Suisse, .KS = Corée…)."
            />
            {action.isin ? (
              <InfoRow
                label="ISIN"
                value={action.isin}
                hint="Identifiant international unique à 12 caractères (2 lettres de pays + 9 caractères + clé). Le seul identifiant fiable à travers toutes les bourses."
              />
            ) : null}
            <InfoRow
              label="Place de cotation"
              value={action.exchange || "—"}
              hint="Bourse où le titre est négocié (NASDAQ, NYSE, Euronext…). Les horaires de cotation et la fiscalité des dividendes dépendent de la place."
            />
          </div>

          {action.businessSummary ? (
            <div className="rounded-lg border border-border-cw p-4">
              <div className="mb-1 flex items-center gap-2">
                <Globe2 className="h-4 w-4 text-text-muted" aria-hidden />
                <p className="text-xs font-medium tracking-wide text-text-secondary uppercase">
                  L&apos;entreprise et son activité
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
