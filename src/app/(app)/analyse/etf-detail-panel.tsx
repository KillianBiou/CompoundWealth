"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import { cn } from "@/components/cn";
import { formatPercent } from "@/lib/money";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
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

const COUNTRY_LABELS_FR: Record<string, string> = {
  "United States": "États-Unis",
  "Japan": "Japon",
  "United Kingdom": "Royaume-Uni",
  "Canada": "Canada",
  "France": "France",
  "Germany": "Allemagne",
  "Switzerland": "Suisse",
  "Netherlands": "Pays-Bas",
  "Luxembourg": "Luxembourg",
  "Ireland": "Irlande",
  "Italy": "Italie",
  "Spain": "Espagne",
  "Sweden": "Suède",
  "Australia": "Australie",
  "Denmark": "Danemark",
  "China": "Chine",
  "India": "Inde",
  "Taiwan": "Taïwan",
  "South Korea": "Corée du Sud",
  "Brazil": "Brésil",
};

const SECTOR_LABELS_FR: Record<string, string> = {
  Technology: "Technologie",
  Financials: "Finance",
  Finance: "Finance",
  Industrials: "Industrie",
  Healthcare: "Santé",
  "Consumer Cyclicals": "Consommation discrétionnaire",
  "Consumer Defensives": "Consommation de base",
  "Consumer Non-Cyclicals": "Consommation de base",
  Energy: "Énergie",
  Utilities: "Services publics",
  "Utilities and Telecommunications": "Services publics & télécoms",
  Telecommunications: "Télécommunications",
  "Non-Energy Materials": "Matériaux",
  "Real Estate": "Immobilier",
  "Communication Services": "Services de communication",
  Other: "Autres",
};

function flagFor(country: string): string {
  return COUNTRY_FLAGS[country] ?? "🏳️";
}

function countryFr(country: string): string {
  return COUNTRY_LABELS_FR[country] ?? country;
}

function sectorFr(sector: string): string {
  return SECTOR_LABELS_FR[sector] ?? sector;
}

/* -------------------------------------------------------------------------- */
/*                                Onglet Général                              */
/* -------------------------------------------------------------------------- */



function GeneralTab({ etf }: { etf: EtfDetail }) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border-cw p-4">
        <p className="font-heading text-base font-semibold text-text-primary">
          {etf.trName || etf.name}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone={etf.distributing ? "positive" : "neutral"}>
            {etf.distributing ? "Distribuant" : "Capitalisant"}
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
                ? "KID / émetteur (ELTIF)"
                : "justETF / émetteur"
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border-cw p-4">
          <HintLabel
            hint="Total Expense Ratio : frais totaux annuels du fonds (gestion, administration, juridique). Ils sont prélevés directement sur le fonds — la performance affichée est donc nette de frais."
            uppercase
          >
            Frais annuels (TER)
          </HintLabel>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {etf.ter !== null ? formatPercent(etf.ter) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            prélevés sur le fonds, inclus dans la performance
          </p>
        </div>
        <div className="rounded-lg border border-border-cw p-4">
          <HintLabel
            hint="Dividendes et coupons versés en cash sur l'année 2025, en pourcentage du cours. Un ETF capitalisant réinvestit automatiquement ces montants dans le fonds (aucun versement en compte)."
            uppercase
          >
            Rendement distribué 2025
          </HintLabel>
          <p className="mt-1 font-heading text-2xl font-semibold tabular-nums text-text-primary">
            {etf.dividendYield2025 ? formatPercent(etf.dividendYield2025) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {etf.distributing ? "dividendes versés en cash" : "ETF capitalisant : 0"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border-cw p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
          Identité
        </p>
        <InfoRow
          label="Émetteur"
          value={etf.provider || etf.emitter}
          hint="Société de gestion qui gère le fonds (BlackRock, Amundi, Vanguard…). Elle décide de la réplication et des frais, mais ne détient pas les actifs : ceux-ci sont segregated chez un dépositaire."
        />
        <InfoRow
          label="Indice suivi"
          value={etf.indexTracked}
          hint="Référence de marché que le fonds cherche à reproduire (ex. MSCI World = ~1 400 grandes entreprises de 23 pays développés). La performance du fonds est comparée à cet indice."
        />
        <InfoRow
          label="Classe d'actifs"
          value={etf.assetClass}
          hint="Type d'actifs détenus par le fonds : actions (Equity), obligations (Bond), private equity (ELTIF non cotés)… Détermine le rendement attendu et le risque."
        />
        <InfoRow
          label="Région"
          value={etf.region}
          hint="Zone géographique couverte par l'indice : World (monde développé), Europe, Emerging Markets, France… Plus la zone est large, plus la diversification est forte."
        />
        <InfoRow
          label="Focus sectoriel"
          value={etf.sectorFocus}
          hint="Secteurs économiques couverts : « All sectors » = toutes industries confondues (technologie, santé, finance…). Un focus unique (ex. Tech only) concentre le risque."
        />
      </div>

      <div className="rounded-lg border border-border-cw p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
          Identifiants
        </p>
        <InfoRow
          label="ISIN"
          value={etf.isin}
          hint="Identifiant international de valeurs : 12 caractères (2 lettres de pays + 9 caractères + clé). Unique par fonds, utilisé partout dans l'app pour rattacher positions et fiches."
        />
        <InfoRow
          label="Ticker"
          value={etf.ticker}
          hint="Symbole court de cotation sur la place principale (ex. WPEA sur Euronext Paris). Plus facile à retenir que l'ISIN."
        />
        {etf.tickerYahoo ? <InfoRow
          label="Symbole Yahoo"
          value={etf.tickerYahoo}
          hint="Symbole utilisé pour récupérer les cours en temps réel via Yahoo Finance (suffixé par la place : .PA = Paris, .DE = Xetra)."
        /> : null}
        {etf.wkn ? <InfoRow
          label="WKN"
          value={etf.wkn}
          hint="Wertpapierkennnummer : identifiant allemand à 6 caractères, équivalent de l'ISIN sur les places germanophones."
        /> : null}
        <InfoRow
          label="Devise du fonds"
          value={etf.fundCurrency || etf.currency}
          hint="Devise de comptabilisation du fonds. Attention : même si le fonds est en USD, la part EUR (hedged) supprime le risque de change ; la part USD (unhedged) y est exposée."
        />
        {etf.currencyRisk ? <InfoRow
          label="Risque de devise"
          value={etf.currencyRisk}
          hint="Unhedged : votre rendement suit aussi les variations EUR/USD (favorable si le dollar monte). Hedged : le change est neutralisé, au coût d'une légère décote de rendement."
        /> : null}
      </div>

      <div className="rounded-lg border border-border-cw p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
          Structure
        </p>
        <InfoRow
          label="Domicile"
          value={etf.domicile}
          hint="Pays d'enregistrement juridique du fonds. Irlande et Luxembourg sont les domiciles UCITS les plus courants : avantage fiscal sur les dividendes US (traité, ~15 % au lieu de 30 %)."
        />
        <InfoRow
          label="Place de cotation"
          value={etf.exchange}
          hint="Bourse où la part est négociée : Euronext Paris, Xetra (Allemagne), Borsa Italiana… La liquidité est généralement la meilleure sur la place dominante."
        />
        <InfoRow
          label="Nombre de valeurs"
          value={etf.holdingsCount ? etf.holdingsCount.toLocaleString("fr-FR") : "—"}
          hint="Nombre de lignes détenues par l'indice : ~1 400 pour MSCI World. Plus il est élevé, meilleure est la diversification (le risque d'une seule entreprise pèse peu)."
        />
        {etf.holdingsAsOf ? <InfoRow
          label="Répartitions du"
          value={etf.holdingsAsOf}
          hint="Date des données de répartition (holdings, pays, secteurs) publiées par l'émetteur — généralement le rapport mensuel ou trimestriel le plus récent."
        /> : null}
      </div>
      {etf.notes ? (
        <div className="rounded-lg border border-border-cw p-4">
          <p className="mb-1 text-xs font-medium tracking-wide text-text-secondary uppercase">
            Bon à savoir
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
  const holdings = etf.topHoldings;
  const [visibleCount, setVisibleCount] = useState(HOLDINGS_PAGE_SIZE);
  if (holdings.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        Liste des valeurs non disponible pour cet ETF.
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
            Top {visible.length} valeurs
          </p>
          <p className="text-xs text-text-muted tabular-nums">
            poids cumulé {formatPercent(visibleWeight)}
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
            Afficher {Math.min(HOLDINGS_PAGE_SIZE, remaining)} valeur{remaining > 1 ? "s" : ""} de plus
          </button>
        ) : null}
      </div>
      <p className="text-xs text-text-muted">
        Poids issus du dernier rapport du fonds — les répartitions complètes
        ({etf.holdingsCount ? etf.holdingsCount.toLocaleString("fr-FR") : "n"} valeurs) sont
        publiées par l&apos;émetteur.
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
  const [expanded, setExpanded] = useState(false);
  if (entries.length === 0) {
    return (
      <p className="py-3 text-center text-sm text-text-muted">
        Répartition non disponible.
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
            Autres
            {hiddenNamed.length > 0 ? (
              <span className="text-xs text-text-muted">
                ({hiddenNamed.length} lignes)
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
          Replier
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
  const hasData = etf.countries.length > 0 || etf.sectors.length > 0;
  return (
    <div className="space-y-5">
      {hasData ? (
        <>
          <div className="rounded-lg border border-border-cw p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <HintLabel
                hint="Répartition géographique du fonds : poids de chaque pays dans le portefeuille de l'ETF, tel que publié par l'émetteur."
                uppercase
              >
                Pays représentés
              </HintLabel>
              {etf.holdingsAsOf ? (
                <p className="text-xs text-text-muted">au {etf.holdingsAsOf}</p>
              ) : null}
            </div>
            <BreakdownList
              entries={etf.countries}
              flag={flagFor}
              translate={countryFr}
            />
          </div>
          <div className="rounded-lg border border-border-cw p-4">
            <HintLabel
              className="mb-3"
              hint="Répartition sectorielle : poids de chaque secteur d'activité (technologie, santé, finance...) dans le portefeuille de l'ETF."
              uppercase
            >
              Secteurs
            </HintLabel>
            <BreakdownList entries={etf.sectors} translate={sectorFr} />
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-text-muted">
          Répartition géographique et sectorielle non disponible pour cet ETF.
        </p>
      )}
      <p className="text-xs text-text-muted">
        Répartitions du fonds publiées par l&apos;émetteur — les 4 premières
        lignes sont affichées, le reste se déplie. Ce sont des répartitions
        « look-through » : elles montrent le contenu réel du panier (actions,
        obligations) que l&apos;ETF détient, pas d&apos;autres fonds en cascade.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Panneau complet                            */
/* -------------------------------------------------------------------------- */

type TabId = "general" | "details" | "diversification";

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "Général" },
  { id: "details", label: "Détails" },
  { id: "diversification", label: "Diversification" },
];

export function EtfDetailPanel({ etf }: { etf: EtfDetail }) {
  const [tab, setTab] = useState<TabId>("general");
  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-lg border border-border-cw bg-bg-subtle/50 p-1">
        {TABS.map(({ id, label }) => (
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
      {tab === "general" ? <GeneralTab etf={etf} /> : null}
      {tab === "details" ? <DetailsTab etf={etf} /> : null}
      {tab === "diversification" ? <DiversificationTab etf={etf} /> : null}
    </div>
  );
}
