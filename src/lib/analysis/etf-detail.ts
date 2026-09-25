import fs from "node:fs";
import path from "node:path";

/**
 * Détail des ETF depuis data/etfDetail.csv : TER, yields de distribution,
 * région, focus sectoriel, émetteur, réplication, éligibilité PEA, etc.
 * Le fichier est fourni par l'utilisateur et remplacé à loisir ; les colonnes
 * TER et yields sont exprimées en pourcents (0,25 = 0,25 %/an).
 */

export interface EtfDetail {
  isin: string;
  ticker: string;
  tickerYahoo: string | null;
  name: string;
  emitter: string;
  indexTracked: string;
  assetClass: "Equity" | "Bond" | string;
  region: string;
  sectorFocus: string;
  /** TER en fraction (0.0025 = 0,25 %/an) */
  ter: number | null;
  replication: string;
  distributing: boolean;
  /** dividend yield 2025 en fraction */
  dividendYield2025: number | null;
  currency: string;
  /** place de cotation principale */
  exchange: string;
  /** pays de domiciliation du fonds */
  domicile: string;
  /** conformité UCITS */
  ucits: boolean;
  /** encours du fonds en millions d'USD */
  fundSizeMusd: number | null;
  /** nombre de valeurs détenues */
  holdingsCount: number | null;
  peaEligible: boolean;
  /** mention USER HOLDING dans les notes */
  userHolding: boolean;
  /** notes libres du CSV (frais détaillés, liquidité, AIFM pour les fonds non cotés) */
  notes: string;
  /** nom officiel distant (Trade Republic / justETF), sinon vide */
  trName: string;
  /** société de gestion (provider justETF), sinon vide */
  provider: string;
  /** devise du fonds (part) */
  fundCurrency: string;
  /** risque de devise (hedged / unhedged) */
  currencyRisk: string;
  /** WKN allemand */
  wkn: string;
  /** date des répartitions (ex. 30/07/2026) */
  holdingsAsOf: string;
  /** top 10 valeurs : nom et poids en fraction */
  topHoldings: { name: string; weight: number }[];
  /** répartition par pays : nom et poids en fraction */
  countries: { name: string; weight: number }[];
  /** répartition par secteur : nom et poids en fraction */
  sectors: { name: string; weight: number }[];
  /** date de la dernière mise à jour des données de référence (ISO) */
  dataAsOf: string;
}

const CACHE_TTL_MS = 60 * 1000;
let cache: { at: number; byIsin: Map<string, EtfDetail> } | null = null;

function toFraction(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed / 100;
}

function toBool(value: string): boolean {
  return value.trim().toLowerCase() === "true";
}

function toNumberOrNull(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseEtfDetailCsv(content: string): EtfDetail[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = (name: string) => headers.findIndex((h) => h === name);
  const iIsin = idx("isin");
  if (iIsin === -1) return [];
  const iTicker = idx("ticker");
  const iTickerYahoo = idx("ticker_yahoo");
  const iName = idx("name");
  const iEmitter = idx("emitter");
  const iIndex = idx("index_tracked");
  const iAsset = idx("asset_class");
  const iRegion = idx("region");
  const iSector = idx("sector_focus");
  const iTer = idx("ter");
  const iReplication = idx("replication");
  const iDistributing = idx("distributing");
  const iY2025 = idx("dividend_yield_2025");
  const iCurrency = idx("currency");
  const iPea = idx("pea_eligible");
  const iNotes = idx("notes");
  const iTrName = idx("tr_name");
  const iProvider = idx("provider");
  const iFundCurrency = idx("fund_currency");
  const iCurrencyRisk = idx("currency_risk");
  const iWkn = idx("wkn");
  const iHoldingsAsOf = idx("holdings_as_of");
  const iTopHoldings = idx("top_holdings");
  const iDataAsOf = idx("data_as_of");
  const iCountries = idx("countries");
  const iSectors = idx("sectors");

  const details: EtfDetail[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    let isin = (cells[iIsin] ?? "").trim().toUpperCase();
    // les lignes alternatives (autres places, variantes hedged) suffixent l'ISIN
    // de base par _ALT : on les rattache à l'ISIN de base, la première ligne vue prime
    const isAlt = isin.endsWith("_ALT");
    if (isAlt) isin = isin.slice(0, -4);
    if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin)) continue;
    if (details.some((d) => d.isin === isin)) continue;
    const notes = (cells[iNotes] ?? "").trim();
    details.push({
      isin,
      ticker: (cells[iTicker] ?? "").trim(),
      tickerYahoo: (cells[iTickerYahoo] ?? "").trim() || null,
      name: (cells[iName] ?? "").trim(),
      emitter: (cells[iEmitter] ?? "").trim(),
      indexTracked: (cells[iIndex] ?? "").trim(),
      assetClass: (cells[iAsset] ?? "").trim(),
      region: (cells[iRegion] ?? "").trim(),
      sectorFocus: (cells[iSector] ?? "").trim(),
      ter: iTer >= 0 ? toFraction(cells[iTer] ?? "") : null,
      replication: (cells[iReplication] ?? "").trim(),
      distributing: iDistributing >= 0 ? toBool(cells[iDistributing] ?? "") : false,
      dividendYield2025: iY2025 >= 0 ? toFraction(cells[iY2025] ?? "") : null,
      currency: (cells[iCurrency] ?? "").trim(),
      exchange: (cells[idx("exchange")] ?? "").trim(),
      domicile: (cells[idx("domicile")] ?? "").trim(),
      ucits: toBool(cells[idx("ucits")] ?? ""),
      fundSizeMusd: toNumberOrNull(cells[idx("fund_size_musd")] ?? ""),
      holdingsCount: toNumberOrNull(cells[idx("holdings_count")] ?? ""),
      peaEligible: iPea >= 0 ? toBool(cells[iPea] ?? "") : false,
      userHolding: /USER HOLDING/i.test(notes),
      notes,
      trName: iTrName >= 0 ? (cells[iTrName] ?? "").trim() : "",
      provider: iProvider >= 0 ? (cells[iProvider] ?? "").trim() : "",
      fundCurrency: iFundCurrency >= 0 ? (cells[iFundCurrency] ?? "").trim() : "",
      currencyRisk: iCurrencyRisk >= 0 ? (cells[iCurrencyRisk] ?? "").trim() : "",
      wkn: iWkn >= 0 ? (cells[iWkn] ?? "").trim() : "",
      holdingsAsOf: iHoldingsAsOf >= 0 ? (cells[iHoldingsAsOf] ?? "").trim() : "",
      topHoldings: iTopHoldings >= 0 ? parseWeightedEntries(cells[iTopHoldings] ?? "") : [],
      countries: iCountries >= 0 ? parseWeightedEntries(cells[iCountries] ?? "") : [],
      sectors: iSectors >= 0 ? parseWeightedEntries(cells[iSectors] ?? "") : [],
      dataAsOf: iDataAsOf >= 0 ? (cells[iDataAsOf] ?? "").trim() : "",
    });
  }
  return details;
}

/**
 * Entrées pondérées « Nom:12.34|Nom2:8.2 » — les poids sont stockés en
 * pourcents dans le CSV (12.34 = 12,34 %) et convertis en fractions.
 */
export function parseWeightedEntries(value: string): { name: string; weight: number }[] {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separator = entry.lastIndexOf(":");
      if (separator === -1) return { name: entry, weight: 0 };
      const name = entry.slice(0, separator).trim();
      const weight = toFraction(entry.slice(separator + 1));
      return { name, weight: weight ?? 0 };
    })
    .filter((entry) => entry.name.length > 0);
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function loadEtfDetails(): Map<string, EtfDetail> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.byIsin;
  const byIsin = new Map<string, EtfDetail>();
  try {
    const file = path.join(process.cwd(), "data", "etfDetail.csv");
    const content = fs.readFileSync(file, "utf8");
    for (const detail of parseEtfDetailCsv(content)) {
      byIsin.set(detail.isin, detail);
    }
  } catch {
    // fichier absent : pas de détail CSV, on retombe sur le catalogue codé
  }
  cache = { at: now, byIsin };
  return byIsin;
}

/** Détail CSV d'un ETF par ISIN ; null si absent du fichier. */
export function getEtfDetailByIsin(isin: string | null): EtfDetail | null {
  if (!isin) return null;
  return loadEtfDetails().get(isin.trim().toUpperCase()) ?? null;
}

/** Détail CSV d'un ETF par ticker (WPEA, IFRE...) ; null si absent. */
export function getEtfDetailByTicker(ticker: string | null): EtfDetail | null {
  if (!ticker) return null;
  const normalized = ticker.trim().toUpperCase();
  for (const detail of loadEtfDetails().values()) {
    if (detail.ticker.toUpperCase() === normalized) return detail;
  }
  return null;
}

/** Tous les détails CSV disponibles (pour l'exploration et les stats). */
export function getAllEtfDetails(): EtfDetail[] {
  return [...loadEtfDetails().values()];
}

/** Liste des ISIN présents dans le CSV — utile pour l'import automatique. */
export function getKnownDetailIsins(): Set<string> {
  return new Set(loadEtfDetails().keys());
}

/** Invalide le cache mémoire — force la relecture du CSV au prochain accès. */
export function invalidateEtfDetailCache(): void {
  cache = null;
}
