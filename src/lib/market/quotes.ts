const YAHOO_HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];
const YAHOO_CHART_PATH = "/v8/finance/chart";
const YAHOO_SEARCH_PATH = "/v1/finance/search";
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 8000;
const SESSION_TTL_MS = 60 * 60 * 1000;

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

let sessionCookie: { value: string; fetchedAt: number } | null = null;

async function getSessionCookie(force = false): Promise<string> {
  if (
    !force &&
    sessionCookie &&
    Date.now() - sessionCookie.fetchedAt < SESSION_TTL_MS
  ) {
    return sessionCookie.value;
  }
  try {
    const response = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const cookies = (response.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(";")[0])
      .join("; ");
    sessionCookie = { value: cookies, fetchedAt: Date.now() };
    return cookies;
  } catch {
    sessionCookie = { value: "", fetchedAt: Date.now() };
    return "";
  }
}

/**
 * Yahoo exige un cookie de session (fc.yahoo.com) depuis 2024, sinon l'API
 * renvoie 429. En cas de 429, on renouvelle la session une fois puis on
 * réessaie, en alternant query1/query2.
 */
async function fetchJson(
  path: string,
  query: string,
): Promise<{ status: number; json: unknown } | { status: number; json: null }> {
  for (const host of YAHOO_HOSTS) {
    let cookie = await getSessionCookie();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch(`https://${host}${path}?${query}`, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "application/json",
            ...(cookie ? { Cookie: cookie } : {}),
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (response.status === 429 && attempt === 0) {
          cookie = await getSessionCookie(true);
          continue;
        }
        if (!response.ok) return { status: response.status, json: null };
        return { status: response.status, json: await response.json() };
      } catch {
        break;
      }
    }
  }
  return { status: 0, json: null };
}

async function yahooQuote(symbol: string): Promise<MarketQuoteResult> {
  const { status, json } = await fetchJson(
    YAHOO_CHART_PATH,
    `symbol=${encodeURIComponent(symbol)}&interval=1d&range=1d`,
  );
  if (status === 0) return { ok: false, reason: "injoignable" };
  if (status !== 200) return { ok: false, reason: `HTTP ${status}` };
  const meta = (json as { chart?: { result?: { meta?: YahooChartMeta }[] } })
    ?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice || !meta.currency) {
    return { ok: false, reason: "symbole inconnu" };
  }
  return {
    ok: true,
    symbol: meta.symbol ?? symbol,
    priceCents: Math.round(meta.regularMarketPrice * 100),
    currency: meta.currency,
  };
}

async function resolveIsin(symbol: string): Promise<string[]> {
  const { json } = await fetchJson(
    YAHOO_SEARCH_PATH,
    `q=${encodeURIComponent(symbol)}&quotesCount=5&newsCount=0`,
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
 * Le symbole peut être un ticker (ex. CW8, WPEA, complété en .PA sur Euronext
 * Paris) ou un ISIN (résolu via la recherche Yahoo, avec fallback .SG).
 */
export async function fetchMarketQuote(symbol: string): Promise<MarketQuoteResult> {
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return { ok: false, reason: "symbole manquant" };

  if (ISIN_PATTERN.test(trimmed)) {
    const candidates = [...(await resolveIsin(trimmed)), `${trimmed}.SG`];
    for (const candidate of candidates) {
      const result = await yahooQuote(candidate);
      if (result.ok) return result;
    }
    return { ok: false, reason: "aucune cotation trouvée pour cet ISIN" };
  }

  for (const suffix of [".PA", ""]) {
    const result = await yahooQuote(`${trimmed}${suffix}`);
    if (result.ok) return result;
  }
  return { ok: false, reason: "aucune cotation trouvée pour ce symbole" };
}
