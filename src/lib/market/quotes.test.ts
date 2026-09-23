import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMarketQuote } from "./quotes";

interface MockCall {
  url: string;
  respond: () => { status: number; body: unknown };
}

function mockFetch(calls: MockCall[]) {
  const seen: string[] = [];
  const impl = async (url: string) => {
    seen.push(url);
    const index = calls.findIndex((call) => url.includes(call.url));
    if (index === -1) {
      return new Response(JSON.stringify({ chart: { result: [] } }), { status: 404 });
    }
    const [call] = calls.splice(index, 1);
    const { status, body } = call.respond();
    return new Response(JSON.stringify(body), { status });
  };
  vi.stubGlobal("fetch", vi.fn(impl));
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchMarketQuote", () => {
  it("résout un ticker via la recherche Yahoo (cotation étrangère)", async () => {
    mockFetch([
      {
        url: "finance/search?q=BJL8",
        respond: () => ({
          status: 200,
          body: { quotes: [{ symbol: "BJL8.DE", quoteType: "ETF" }] },
        }),
      },
      {
        url: "chart/BJL8.DE",
        respond: () => ({
          status: 200,
          body: {
            chart: {
              result: [
                {
                  meta: { symbol: "BJL8.DE", currency: "EUR", regularMarketPrice: 11.15 },
                },
              ],
            },
          },
        }),
      },
    ]);
    const result = await fetchMarketQuote("BJL8");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.symbol).toBe("BJL8.DE");
      expect(result.priceCents).toBe(1115);
      expect(result.currency).toBe("EUR");
    }
  });

  it("résout un ticker Euronext via l'ISIN du catalogue (IFRE → IS3U.DE)", async () => {
    mockFetch([
      {
        url: "finance/search?q=IFRE",
        respond: () => ({
          status: 200,
          body: { quotes: [{ symbol: "1320.T", quoteType: "ETF" }] },
        }),
      },
      {
        url: "chart/1320.T",
        respond: () => ({ status: 200, body: { chart: { result: [] } } }),
      },
      {
        url: "finance/search?q=IE00BP3QZJ36",
        respond: () => ({
          status: 200,
          body: { quotes: [{ symbol: "IS3U.DE", quoteType: "ETF" }] },
        }),
      },
      {
        url: "chart/IS3U.DE",
        respond: () => ({
          status: 200,
          body: {
            chart: {
              result: [
                {
                  meta: { symbol: "IS3U.DE", currency: "EUR", regularMarketPrice: 64.15 },
                },
              ],
            },
          },
        }),
      },
    ]);
    const result = await fetchMarketQuote("IFRE");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.symbol).toBe("IS3U.DE");
      expect(result.priceCents).toBe(6415);
    }
  });

  it("essaie les suffixes de place si la recherche ne donne rien", async () => {
    mockFetch([
      {
        url: "finance/search?q=CW8",
        respond: () => ({ status: 200, body: { quotes: [] } }),
      },
      {
        url: "chart/CW8.PA",
        respond: () => ({
          status: 200,
          body: {
            chart: {
              result: [
                {
                  meta: { symbol: "CW8.PA", currency: "EUR", regularMarketPrice: 703.73 },
                },
              ],
            },
          },
        }),
      },
    ]);
    const result = await fetchMarketQuote("CW8");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.priceCents).toBe(70373);
  });

  it("retourne la raison quand rien n'est trouvé", async () => {
    mockFetch([
      {
        url: "finance/search?q=XXXX",
        respond: () => ({ status: 200, body: { quotes: [] } }),
      },
    ]);
    const result = await fetchMarketQuote("XXXX");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("aucune cotation");
  });
});
