import { getEtfByIsin, getEtfByTicker } from "@/lib/etf-catalog";

const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const YAHOO_CHART_PATH = "/v8/finance/chart";
const YAHOO_SEARCH_PATH = "/v1/finance/search";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 8000;
const RESOLUTION_TTL_MS = 24 * 60 * 60 * 1000;

const symbolResolutionCache = new Map<string, { symbol: string; fetchedAt: number }>();

export interface MarketHistoryPoint {
  date: Date;
  closeCents: number;
}

export type MarketHistoryResult =
  | { ok: true; symbol: string; points: MarketHistoryPoint[] }
  | { ok: false; reason: string };

async function resolveYahooSymbol(symbol: string): Promise<string | null> {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return null;
  const cached = symbolResolutionCache.get(trimmed);
  if (cached) return cached.symbol;
  const catalogEntry = ISIN_PATTERN.test(trimmed)
    ? getEtfByIsin(trimmed)
    : getEtfByTicker(trimmed);
  if (catalogEntry?.yahooSymbol) {
    symbolResolutionCache.set(trimmed, {
      symbol: catalogEntry.yahooSymbol,
      fetchedAt: Date.now(),
    });
    return catalogEntry.yahooSymbol;
  }
  const quote = await fetchMarketQuote(trimmed);
  return quote.ok ? quote.symbol : null;
}

/**
 * Recupere tout l'historique quotidien des cours entre deux dates en une seule
 * requete (endpoint chart avec period1/period2 et interval=1d) : des annees
 * de donnees pour un seul appel, au lieu d'un appel par jour.
 */
export async function fetchMarketHistory(
  symbol: string,
  fromDate: Date,
  toDate: Date,
): Promise<MarketHistoryResult> {
  const resolved = await resolveYahooSymbol(symbol);
  if (!resolved) return { ok: false, reason: "symbole introuvable" };
  const query = `period1=${Math.floor(fromDate.getTime() / 1000)}&period2=${Math.floor(
    toDate.getTime() / 1000,
  )}&interval=1d`;
  const { status, json } = await fetchJson(
    `${YAHOO_CHART_PATH}/${encodeURIComponent(resolved)}`,
    query,
  );
  if (status === 0) return { ok: false, reason: "injoignable" };
  if (status !== 200) return { ok: false, reason: `HTTP ${status}` };
  const result = (
    json as {
      chart?: {
        result?: {
          timestamp?: number[];
          indicators?: { quote?: { close?: (number | null)[] }[] };
        }[];
      };
    }
  )?.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const byDay = new Map<string, number>();
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    if (close == null) continue;
    const dayKey = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
    byDay.set(dayKey, Math.round(close * 100));
  }
  const points = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, closeCents]) => ({ date: new Date(day), closeCents }));
  if (points.length === 0) return { ok: false, reason: "aucune donnee historique" };
  return { ok: true, symbol: resolved, points };
}

export interface MarketQuote {
  symbol: string;
  /** prix en centimes (1/100 d'unité de la devise) */
  priceCents: number;
  currency: string;
}

export type MarketQuoteResult =
  | ({ ok: true } & MarketQuote)
  | { ok: false; reason: string };

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

interface YahooChartMeta {
  symbol?: string;
  currency?: string;
  regularMarketPrice?: number;
}

/**
 * L'API chart de Yahoo est ouverte sans session ; envoyer un cookie sans le
 * crumb associé déclenche au contraire un 429. On envoie donc exactement ce
 * qu'un curl simple envoie : un User-Agent navigateur et rien d'autre, en
 * basculant sur query2 si query1 échoue côté réseau.
 */
async function fetchJson(
  path: string,
  query: string,
): Promise<{ status: number; json: unknown } | { status: number; json: null }> {
  for (const host of YAHOO_HOSTS) {
    try {
      const response = await fetch(`https://${host}${path}?${query}`, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) return { status: response.status, json: null };
      return { status: response.status, json: await response.json() };
    } catch {
      continue;
    }
  }
  return { status: 0, json: null };
}

async function yahooQuote(symbol: string): Promise<MarketQuoteResult> {
  const { status, json } = await fetchJson(
    `${YAHOO_CHART_PATH}/${encodeURIComponent(symbol)}`,
    "interval=1d&range=1d",
  );
  if (status === 0) return { ok: false, reason: "injoignable" };
  if (status !== 200) return { ok: false, reason: `HTTP ${status}` };
  const meta = (json as { chart?: { result?: { meta?: YahooChartMeta }[] } })
    ?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice || !meta.currency) {
    return { ok: false, reason: `pas de cotation ${symbol}` };
  }
  return {
    ok: true,
    symbol: meta.symbol ?? symbol,
    priceCents: Math.round(meta.regularMarketPrice * 100),
    currency: meta.currency,
  };
}

async function resolveViaSearch(query: string): Promise<string[]> {
  const { json } = await fetchJson(
    YAHOO_SEARCH_PATH,
    `q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`,
  );
  const quotes =
    (json as { quotes?: { symbol: string; quoteType: string }[] })?.quotes ?? [];
  const candidates = quotes
    .filter((q) => q.quoteType === "ETF" || q.quoteType === "EQUITY")
    .map((q) => q.symbol);
  if (candidates.length > 0) return candidates;
  return quotes.map((q) => q.symbol);
}

/**
 * Récupère le prix actuel d'une position depuis Yahoo Finance (source ouverte).
 * Les ETF européens ne cotent pas tous à Paris : un ticker nu (ex. BJL8) peut
 * coter à Francfort (.DE), Amsterdam (.AS) ou n'être qu'un code Euronext sans
 * symbole Yahoo (ex. IFRE → résolu via son ISIN). On essaie dans l'ordre :
 * recherche Yahoo par ticker, ISIN du catalogue, suffixes de place usuels.
 */
export async function fetchMarketQuote(symbol: string): Promise<MarketQuoteResult> {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return { ok: false, reason: "symbole manquant" };

  if (ISIN_PATTERN.test(trimmed)) {
    const catalogEntry = getEtfByIsin(trimmed);
    if (catalogEntry?.yahooSymbol) {
      const result = await yahooQuote(catalogEntry.yahooSymbol);
      if (result.ok) return result;
    }
    const candidates = [...(await resolveViaSearch(trimmed)), `${trimmed}.SG`];
    let rateLimited = false;
    for (const candidate of candidates) {
      const result = await yahooQuote(candidate);
      if (result.ok) return result;
      if (result.reason.startsWith("HTTP 429")) rateLimited = true;
    }
    if (rateLimited) {
      return { ok: false, reason: "Yahoo limite les requêtes (429), réessayez dans quelques minutes" };
    }
    return { ok: false, reason: "aucune cotation trouvée pour cet ISIN" };
  }

  const cached = symbolResolutionCache.get(trimmed);
  if (cached && Date.now() - cached.fetchedAt < RESOLUTION_TTL_MS) {
    const result = await yahooQuote(cached.symbol);
    if (result.ok) return result;
  }

  const catalogEntry = getEtfByTicker(trimmed);
  if (catalogEntry?.yahooSymbol) {
    const result = await yahooQuote(catalogEntry.yahooSymbol);
    if (result.ok) {
      symbolResolutionCache.set(trimmed, { symbol: result.symbol, fetchedAt: Date.now() });
      return result;
    }
    if (result.reason.startsWith("HTTP 429")) {
      return { ok: false, reason: "Yahoo limite les requêtes (429), réessayez dans quelques minutes" };
    }
  }

  const candidates = [
    ...(catalogEntry ? [catalogEntry.isin] : []),
    ...(await resolveViaSearch(trimmed)),
    `${trimmed}.PA`,
    `${trimmed}.DE`,
  ];
  const tried = new Set<string>();
  let rateLimited = false;
  for (const candidate of candidates) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    const result = ISIN_PATTERN.test(candidate)
      ? await fetchMarketQuote(candidate)
      : await yahooQuote(candidate);
    if (result.ok) {
      symbolResolutionCache.set(trimmed, { symbol: result.symbol, fetchedAt: Date.now() });
      return result;
    }
    if (result.reason.startsWith("HTTP 429")) rateLimited = true;
  }
  if (rateLimited) {
    return { ok: false, reason: "Yahoo limite les requêtes (429), réessayez dans quelques minutes" };
  }
  return { ok: false, reason: "aucune cotation trouvée pour ce symbole" };
}
