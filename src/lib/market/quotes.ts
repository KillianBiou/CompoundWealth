const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const YAHOO_CHART_PATH = "/v8/finance/chart";
const YAHOO_SEARCH_PATH = "/v1/finance/search";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 8000;

export interface MarketQuote {
  symbol: string;
  /** prix en centimes (1/100 d'unité de la devise) */
  priceCents: number;
  currency: string;
}

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

interface YahooChartMeta {
  symbol: string;
  currency: string;
  regularMarketPrice?: number;
}

async function fetchJson(path: string, query: string): Promise<unknown> {
  for (const host of YAHOO_HOSTS) {
    try {
      const response = await fetch(`https://${host}${path}?${query}`, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      return await response.json();
    } catch {
      continue;
    }
  }
  return null;
}

async function yahooQuote(symbol: string): Promise<MarketQuote | null> {
  const json = (await fetchJson(
    YAHOO_CHART_PATH,
    `symbol=${encodeURIComponent(symbol)}&interval=1d&range=1d`,
  )) as { chart?: { result?: { meta?: YahooChartMeta }[] } } | null;
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice || !meta.currency) return null;
  return {
    symbol: meta.symbol ?? symbol,
    priceCents: Math.round(meta.regularMarketPrice * 100),
    currency: meta.currency,
  };
}

async function resolveIsin(symbol: string): Promise<string[]> {
  const json = (await fetchJson(
    YAHOO_SEARCH_PATH,
    `q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0`,
  )) as { quotes?: { symbol: string; quoteType: string }[] } | null;
  const quotes = json?.quotes ?? [];
  const candidates = quotes
    .filter((q) => q.quoteType === "ETF" || q.quoteType === "EQUITY")
    .map((q) => q.symbol);
  if (candidates.length > 0) return candidates;
  return quotes.map((q) => q.symbol);
}

/**
 * Récupère le prix actuel d'une position depuis Yahoo Finance (source ouverte).
 * Le symbole peut être un ticker (ex. CW8, WPEA, complété en .PA sur Euronext
 * Paris) ou un ISIN (résolu via la recherche Yahoo, avec fallback .SG).
 */
export async function fetchMarketQuote(
  symbol: string,
  exchangeHints: string[] = [".PA", ""],
): Promise<MarketQuote | null> {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return null;

  if (ISIN_PATTERN.test(trimmed)) {
    const candidates = await resolveIsin(trimmed);
    for (const candidate of [...candidates, `${trimmed}.SG`]) {
      const quote = await yahooQuote(candidate);
      if (quote) return quote;
    }
    return null;
  }

  for (const hint of exchangeHints) {
    const quote = await yahooQuote(`${trimmed}${hint}`);
    if (quote) return quote;
  }
  return null;
}
