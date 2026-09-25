import fs from "node:fs";

export interface ActionDetail {
  name: string;
  ticker: string;
  tickerYahoo: string;
  isin: string;
  country: string;
  sector: string;
  exchange: string;
  longName: string;
  currency: string;
  /** dernier cours, dans la devise de cotation */
  price: number | null;
  previousClose: number | null;
  /** capitalisation boursière, dans la devise de cotation */
  marketCap: number | null;
  /** ratio cours/bénéfices sur 12 mois glissants */
  trailingPe: number | null;
  forwardPe: number | null;
  priceToBook: number | null;
  /** rendement du dividende en fraction (0.004 = 0,4 %) */
  dividendYield: number | null;
  /** dividende annuel par action, dans la devise de cotation */
  dividendRate: number | null;
  /** part du bénéfice distribuée, en fraction */
  payoutRatio: number | null;
  beta: number | null;
  volume: number | null;
  averageVolume3Month: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyDayAverage: number | null;
  twoHundredDayAverage: number | null;
  industry: string;
  website: string;
  hqCity: string;
  hqState: string;
  fullTimeEmployees: number | null;
  businessSummary: string;
  notes: string;
  /** date de la dernière mise à jour des données de référence (ISO) */
  dataAsOf: string;
}

const CACHE_TTL_MS = 60 * 1000;

let cache: { at: number; byTickerYahoo: Map<string, ActionDetail> } | null = null;

function toNumberOrNull(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Yahoo renvoie dividend_yield et payout_ratio déjà en fraction brute
 * (0.0241 = 2,41 %) : aucune conversion nécessaire, contrairement aux
 * pourcents du CSV ETF.
 */
function toFraction(value: string): number | null {
  return toNumberOrNull(value);
}

export function parseActionDetailCsv(content: string): ActionDetail[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const idx = (name: string) => headers.findIndex((h) => h === name);
  const iTickerYahoo = idx("ticker_yahoo");
  if (iTickerYahoo === -1) return [];
  const iTicker = idx("ticker");
  const iName = idx("name");
  const iIsin = idx("isin");
  const iCountry = idx("country");
  const iSector = idx("sector");
  const iExchange = idx("exchange");
  const iLongName = idx("long_name");
  const iCurrency = idx("currency");
  const iPrice = idx("price");
  const iPreviousClose = idx("previous_close");
  const iMarketCap = idx("market_cap");
  const iTrailingPe = idx("trailing_pe");
  const iForwardPe = idx("forward_pe");
  const iPriceToBook = idx("price_to_book");
  const iDividendYield = idx("dividend_yield");
  const iDividendRate = idx("dividend_rate");
  const iPayoutRatio = idx("payout_ratio");
  const iBeta = idx("beta");
  const iVolume = idx("volume");
  const iAverageVolume = idx("average_volume_3m");
  const iFiftyTwoHigh = idx("fifty_two_week_high");
  const iFiftyTwoLow = idx("fifty_two_week_low");
  const iFiftyDay = idx("fifty_day_average");
  const iTwoHundredDay = idx("two_hundred_day_average");
  const iIndustry = idx("industry");
  const iWebsite = idx("website");
  const iHqCity = idx("hq_city");
  const iHqState = idx("hq_state");
  const iEmployees = idx("full_time_employees");
  const iSummary = idx("business_summary");
  const iNotes = idx("notes");
  const iDataAsOf = idx("data_as_of");

  const details: ActionDetail[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const tickerYahoo = (cells[iTickerYahoo] ?? "").trim();
    if (!tickerYahoo) continue;
    if (details.some((d) => d.tickerYahoo === tickerYahoo)) continue;
    details.push({
      name: (cells[iName] ?? "").trim(),
      ticker: (cells[iTicker] ?? "").trim(),
      tickerYahoo,
      isin: (cells[iIsin] ?? "").trim(),
      country: (cells[iCountry] ?? "").trim(),
      sector: (cells[iSector] ?? "").trim(),
      exchange: (cells[iExchange] ?? "").trim(),
      longName: iLongName >= 0 ? (cells[iLongName] ?? "").trim() : "",
      currency: iCurrency >= 0 ? (cells[iCurrency] ?? "").trim() : "",
      price: iPrice >= 0 ? toNumberOrNull(cells[iPrice] ?? "") : null,
      previousClose: iPreviousClose >= 0 ? toNumberOrNull(cells[iPreviousClose] ?? "") : null,
      marketCap: iMarketCap >= 0 ? toNumberOrNull(cells[iMarketCap] ?? "") : null,
      trailingPe: iTrailingPe >= 0 ? toNumberOrNull(cells[iTrailingPe] ?? "") : null,
      forwardPe: iForwardPe >= 0 ? toNumberOrNull(cells[iForwardPe] ?? "") : null,
      priceToBook: iPriceToBook >= 0 ? toNumberOrNull(cells[iPriceToBook] ?? "") : null,
      dividendYield: iDividendYield >= 0 ? toFraction(cells[iDividendYield] ?? "") : null,
      dividendRate: iDividendRate >= 0 ? toNumberOrNull(cells[iDividendRate] ?? "") : null,
      payoutRatio: iPayoutRatio >= 0 ? toFraction(cells[iPayoutRatio] ?? "") : null,
      beta: iBeta >= 0 ? toNumberOrNull(cells[iBeta] ?? "") : null,
      volume: iVolume >= 0 ? toNumberOrNull(cells[iVolume] ?? "") : null,
      averageVolume3Month: iAverageVolume >= 0 ? toNumberOrNull(cells[iAverageVolume] ?? "") : null,
      fiftyTwoWeekHigh: iFiftyTwoHigh >= 0 ? toNumberOrNull(cells[iFiftyTwoHigh] ?? "") : null,
      fiftyTwoWeekLow: iFiftyTwoLow >= 0 ? toNumberOrNull(cells[iFiftyTwoLow] ?? "") : null,
      fiftyDayAverage: iFiftyDay >= 0 ? toNumberOrNull(cells[iFiftyDay] ?? "") : null,
      twoHundredDayAverage:
        iTwoHundredDay >= 0 ? toNumberOrNull(cells[iTwoHundredDay] ?? "") : null,
      industry: iIndustry >= 0 ? (cells[iIndustry] ?? "").trim() : "",
      website: iWebsite >= 0 ? (cells[iWebsite] ?? "").trim() : "",
      hqCity: iHqCity >= 0 ? (cells[iHqCity] ?? "").trim() : "",
      hqState: iHqState >= 0 ? (cells[iHqState] ?? "").trim() : "",
      fullTimeEmployees: iEmployees >= 0 ? toNumberOrNull(cells[iEmployees] ?? "") : null,
      businessSummary: iSummary >= 0 ? (cells[iSummary] ?? "").trim() : "",
      notes: iNotes >= 0 ? (cells[iNotes] ?? "").trim() : "",
      dataAsOf: iDataAsOf >= 0 ? (cells[iDataAsOf] ?? "").trim() : "",
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

/** Détails des actions depuis data/actionDetail.csv (cache 60 s). */
export function getAllActionDetails(): ActionDetail[] {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return [...cache.byTickerYahoo.values()];
  }
  let content = "";
  try {
    content = fs.readFileSync("data/actionDetail.csv", "utf8");
  } catch {
    cache = { at: now, byTickerYahoo: new Map() };
    return [];
  }
  const byTickerYahoo = new Map<string, ActionDetail>();
  for (const detail of parseActionDetailCsv(content)) {
    byTickerYahoo.set(detail.tickerYahoo, detail);
    if (detail.isin) {
      byTickerYahoo.set(detail.isin, detail);
    }
  }
  cache = { at: now, byTickerYahoo };
  return [...byTickerYahoo.values()].filter(
    (detail, index, all) =>
      all.findIndex((d) => d.tickerYahoo === detail.tickerYahoo) === index,
  );
}

export function getActionDetailBySymbol(symbol: string): ActionDetail | null {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return null;
  getAllActionDetails();
  if (!cache) return null;
  return (
    cache.byTickerYahoo.get(trimmed) ??
    cache.byTickerYahoo.get(symbol.trim()) ??
    null
  );
}
