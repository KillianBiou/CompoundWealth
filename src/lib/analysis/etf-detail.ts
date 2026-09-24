import fs from "node:fs";
import path from "node:path";

/**
 * Détail des ETF depuis example/etfDetail.csv : TER, yields de distribution,
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
  peaEligible: boolean;
  /** mention USER HOLDING dans les notes */
  userHolding: boolean;
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
      peaEligible: iPea >= 0 ? toBool(cells[iPea] ?? "") : false,
      userHolding: /USER HOLDING/i.test(notes),
    });
  }
  return details;
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
    const file = path.join(process.cwd(), "example", "etfDetail.csv");
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

/** Tous les détails CSV disponibles (pour l'exploration et les stats). */
export function getAllEtfDetails(): EtfDetail[] {
  return [...loadEtfDetails().values()];
}

/** Liste des ISIN présents dans le CSV — utile pour l'import automatique. */
export function getKnownDetailIsins(): Set<string> {
  return new Set(loadEtfDetails().keys());
}
