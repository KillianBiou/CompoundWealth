export interface InstrumentQuote {
  symbol: string;
  name: string;
  exchange: string;
  type: "ETF" | "EQUITY" | "BOND" | "FUND" | "OTHER";
  priceEur?: number;
  currency?: string;
}

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
  Accept: "application/json",
};

const HOSTS = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"];

async function fetchWithFallback(urlByHost: (host: string) => string): Promise<Response | null> {
  for (const host of HOSTS) {
    try {
      const res = await fetch(urlByHost(host), {
        headers: HEADERS,
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.status === 429 || res.status === 401) continue;
      if (res.ok) return res;
    } catch {
      // essaie l'hôte suivant
    }
  }
  return null;
}

function mapType(quoteType?: string, typeDisp?: string): InstrumentQuote["type"] {
  const t = (quoteType ?? typeDisp ?? "").toUpperCase();
  if (t.includes("ETF") || t.includes("ETN")) return "ETF";
  if (t.includes("EQUITY") || t.includes("STOCK")) return "EQUITY";
  if (t.includes("BOND") || t.includes("DEBT")) return "BOND";
  if (t.includes("MUTUAL") || t.includes("FUND")) return "FUND";
  return "OTHER";
}

export function categoryFromInstrumentType(type: InstrumentQuote["type"]): "ETF" | "STOCK" | "BOND" | "FUND" | "OTHER" {
  switch (type) {
    case "ETF":
      return "ETF";
    case "EQUITY":
      return "STOCK";
    case "BOND":
      return "BOND";
    case "FUND":
      return "FUND";
    default:
      return "OTHER";
  }
}

export async function searchInstruments(query: string): Promise<InstrumentQuote[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const res = await fetchWithFallback(
    (host) =>
      `https://${host}/v1/finance/search?q=${encodeURIComponent(
        trimmed,
      )}&quotesCount=8&newsCount=0&quotesQueryId=tss_match_phrase_query`,
  );
  if (!res) return [];

  const json = (await res.json()) as {
    quotes?: {
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      quoteType?: string;
      typeDisp?: string;
    }[];
  };

  const seen = new Set<string>();
  const out: InstrumentQuote[] = [];
  for (const q of json.quotes ?? []) {
    if (!q.symbol || seen.has(q.symbol)) continue;
    seen.add(q.symbol);
    out.push({
      symbol: q.symbol,
      name: q.longname ?? q.shortname ?? q.symbol,
      exchange: q.exchange ?? "",
      type: mapType(q.quoteType, q.typeDisp),
    });
  }
  return out;
}

export async function getInstrumentPrice(symbol: string): Promise<InstrumentQuote | null> {
  const res = await fetchWithFallback(
    (host) =>
      `https://${host}/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
  );
  if (!res) return null;

  const json = (await res.json()) as {
    chart?: {
      result?: {
        meta?: {
          symbol?: string;
          shortName?: string;
          longName?: string;
          regularMarketPrice?: number;
          currency?: string;
          fullExchangeName?: string;
          instrumentType?: string;
        };
      }[];
    };
  };

  const meta = json.chart?.result?.[0]?.meta;
  if (!meta?.symbol) return null;
  return {
    symbol: meta.symbol,
    name: meta.shortName ?? meta.longName ?? meta.symbol,
    exchange: meta.fullExchangeName ?? "",
    type: mapType(meta.instrumentType),
    priceEur: meta.regularMarketPrice,
    currency: meta.currency,
  };
}
