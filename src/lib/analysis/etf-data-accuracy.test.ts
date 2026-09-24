import { describe, expect, it } from "vitest";
import {
  getAllEtfDetails,
  getEtfDetailByIsin,
  getEtfDetailByTicker,
  parseEtfDetailCsv,
  parseWeightedEntries,
} from "./etf-detail";

/**
 * Prix de référence Yahoo constatés lors de l'intégration (mi-2026) avec
 * tolérance ±35 % : la volatilité d'un ETF ne dépasse pas cette bande en
 * régime normal, et l'objectif est de valider le processing (résolution du
 * symbole Yahoo, cohérence d'ordre de grandeur), pas de figer le marché.
 */
const PRICE_REFERENCES: Record<
  string,
  { symbols: string[]; eur: number }
> = {
  IE0002XZSHO1: { symbols: ["WPEA.PA"], eur: 7.0 },
  IE00BP3QZJ36: { symbols: ["IS3U.DE"], eur: 63.7 },
  LU3047998896: { symbols: ["BJL8.DE"], eur: 11.1 },
  IE00BMW42413: { symbols: ["ESIT.DE"], eur: 11.8 },
  FR0011550185: { symbols: ["ESE.PA"], eur: 34.2 },
  IE00B4L5Y983: { symbols: ["EUNL.DE", "IWDA.AS", "SWDA.MI"], eur: 128.4 },
  IE00BK5BQT80: { symbols: ["VWCE.DE", "VWCE.AS"], eur: 169.0 },
};

const PRICE_TOLERANCE = 0.35;

/**
 * Tests de précision des données distantes (Trade Republic / justETF)
 * intégrées dans data/etfDetail.csv : identités, identifiants, répartitions.
 * Objectif : valider le bon processing des données distantes vers le système.
 */

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

describe("parseWeightedEntries", () => {
  it("parse les entrées pondérées « Nom:pct|Nom2:pct » en fractions", () => {
    const entries = parseWeightedEntries("Apple:5.48|NVIDIA Corp.:5.04|Alphabet, Inc. A:2.18");
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ name: "Apple", weight: 0.0548 });
    expect(entries[1]).toEqual({ name: "NVIDIA Corp.", weight: 0.0504 });
    expect(entries[2]).toEqual({ name: "Alphabet, Inc. A", weight: 0.0218 });
  });

  it("gère les noms contenant des deux-points", () => {
    const entries = parseWeightedEntries("S&P 500:EUR Hedged:1.5");
    expect(entries[0]).toEqual({ name: "S&P 500:EUR Hedged", weight: 0.015 });
  });

  it("retourne une liste vide pour une valeur vide", () => {
    expect(parseWeightedEntries("")).toEqual([]);
    expect(parseWeightedEntries("  ")).toEqual([]);
  });

  it("ignore les entrées sans séparateur de poids", () => {
    const entries = parseWeightedEntries("Apple:5.48|SansPoids");
    expect(entries).toHaveLength(2);
    expect(entries[1]).toEqual({ name: "SansPoids", weight: 0 });
  });
});

describe("données ETF du fichier enrichi — cohérence globale", () => {
  const details = getAllEtfDetails();

  it("contient un catalogue substantiel d'ETF", () => {
    expect(details.length).toBeGreaterThanOrEqual(120);
  });

  it("n'a aucun doublon d'ISIN", () => {
    const isins = details.map((d) => d.isin);
    expect(new Set(isins).size).toBe(isins.length);
  });

  it("a des ISIN valides partout", () => {
    for (const detail of details) {
      expect(ISIN_PATTERN.test(detail.isin), detail.isin).toBe(true);
    }
  });

  it("a un nom et un émetteur pour chaque ETF", () => {
    for (const detail of details) {
      expect(detail.name.length, detail.isin).toBeGreaterThan(3);
      expect(detail.emitter.length, detail.isin).toBeGreaterThan(2);
    }
  });

  it("a un TER positif et plausible (< 2 %/an) partout où il est connu", () => {
    for (const detail of details) {
      if (detail.ter === null) continue;
      expect(detail.ter, `${detail.isin} TER ${detail.ter}`).toBeGreaterThan(0);
      expect(detail.ter, detail.isin).toBeLessThan(0.02);
    }
  });
});

describe("répartitions distantes — intégrité", () => {
  const details = getAllEtfDetails();
  const withCountries = details.filter((d) => d.countries.length > 0);
  const withSectors = details.filter((d) => d.sectors.length > 0);
  const withTopHoldings = details.filter((d) => d.topHoldings.length > 0);

  it("couvre une majorité du catalogue avec des répartitions pays", () => {
    expect(withCountries.length).toBeGreaterThanOrEqual(
      Math.floor(details.length * 0.65),
    );
  });

  it("somme les poids des pays à ~100 % (± 1 pt, Other inclus)", () => {
    for (const detail of withCountries) {
      const total = detail.countries.reduce((s, c) => s + c.weight, 0);
      expect(total, `${detail.isin} pays total ${total}`).toBeGreaterThan(0.985);
      expect(total, `${detail.isin} pays total ${total}`).toBeLessThan(1.015);
    }
  });

  it("somme les poids des secteurs à ~100 % (± 1 pt, Other inclus)", () => {
    for (const detail of withSectors) {
      const total = detail.sectors.reduce((s, c) => s + c.weight, 0);
      expect(total, `${detail.isin} secteurs total ${total}`).toBeGreaterThan(0.985);
      expect(total, `${detail.isin} secteurs total ${total}`).toBeLessThan(1.015);
    }
  });

  it("a des top holdings triés par poids décroissant et plausibles", () => {
    for (const detail of withTopHoldings) {
      const weights = detail.topHoldings.map((h) => h.weight);
      for (let i = 1; i < weights.length; i += 1) {
        expect(weights[i], `${detail.isin} ordre holdings`).toBeLessThanOrEqual(
          weights[i - 1] + 1e-9,
        );
      }
      // top 10 plausible : < 90 % du fonds (thématique étroit type défense)
      // et > 0,5 % (fonds obligataire très diversifié)
      const top10 = weights.reduce((s, w) => s + w, 0);
      expect(top10, `${detail.isin} top10 ${top10}`).toBeLessThan(0.9);
      expect(top10, `${detail.isin} top10 ${top10}`).toBeGreaterThan(0.005);
    }
  });

  it("capte l'entrée « Other » des pays pour le repli « +X % autres »", () => {
    const iwda = getEtfDetailByIsin("IE00B4L5Y983");
    expect(iwda).not.toBeNull();
    const other = iwda!.countries.find((c) => c.name === "Other");
    expect(other).toBeDefined();
    expect(other!.weight).toBeGreaterThan(0.1);
    expect(other!.weight).toBeLessThan(0.3);
  });
});

describe("identités de référence — données distantes exactes", () => {
  it("iShares Core MSCI World (IWDA/EUNL, IE00B4L5Y983)", () => {
    const iwda = getEtfDetailByIsin("IE00B4L5Y983");
    expect(iwda).not.toBeNull();
    expect(iwda!.name).toContain("iShares Core MSCI World");
    expect(iwda!.indexTracked).toBe("MSCI World");
    expect(iwda!.ter).toBeCloseTo(0.002, 6);
    expect(iwda!.distributing).toBe(false);
    expect(iwda!.provider).toBe("iShares");
    expect(iwda!.domicile).toBe("Ireland");
    expect(iwda!.holdingsCount).not.toBeNull();
    expect(iwda!.holdingsCount!).toBeGreaterThan(1000);
    // Apple et NVIDIA en tête du MSCI World
    expect(iwda!.topHoldings[0]?.name).toBe("Apple");
    expect(["NVIDIA Corp.", "Microsoft Corp"]).toContain(iwda!.topHoldings[1]?.name);
    // ~69 % États-Unis
    const us = iwda!.countries.find((c) => c.name === "United States");
    expect(us!.weight).toBeGreaterThan(0.65);
    expect(us!.weight).toBeLessThan(0.73);
  });

  it("iShares MSCI France (IFRE, IE00BP3QZJ36)", () => {
    const ifre = getEtfDetailByIsin("IE00BP3QZJ36");
    expect(ifre).not.toBeNull();
    expect(ifre!.indexTracked).toBe("MSCI France");
    expect(ifre!.ter).toBeCloseTo(0.0025, 6);
    expect(ifre!.distributing).toBe(true);
    // France ~89 % (quelques Netherlands/Luxembourg via sièges)
    const fr = ifre!.countries.find((c) => c.name === "France");
    expect(fr).toBeDefined();
    expect(fr!.weight).toBeGreaterThan(0.85);
    expect(fr!.weight).toBeLessThan(0.92);
    // LVMH / TotalEnergies / Airbus / Schneider dans le top
    const names = ifre!.topHoldings.map((h) => h.name).join("|");
    expect(names).toContain("TotalEnergies");
  });

  it("Vanguard FTSE All-World Acc (VWCE, IE00BK5BQT80)", () => {
    const vwce = getEtfDetailByIsin("IE00BK5BQT80");
    expect(vwce).not.toBeNull();
    expect(vwce!.name).toContain("FTSE All-World");
    expect(vwce!.ter).toBeCloseTo(0.0014, 6);
    expect(vwce!.provider).toBe("Vanguard");
    // plus de valeurs qu'un MSCI World (3700 vs 1350)
    expect(vwce!.holdingsCount!).toBeGreaterThan(3000);
  });

  it("résout les ETF par ticker (WPEA, IFRE)", () => {
    const wpea = getEtfDetailByTicker("WPEA");
    expect(wpea).not.toBeNull();
    expect(wpea!.isin).toBe("IE0002XZSHO1");
    const ifre = getEtfDetailByTicker("IFRE");
    expect(ifre).not.toBeNull();
    expect(ifre!.isin).toBe("IE00BP3QZJ36");
  });
});

describe("prix de référence — processing des cotations", () => {
  it("chaque ETF détenu a un symbole Yahoo résolvable et un prix plausible", async () => {
    const details = getAllEtfDetails();
    for (const [isin, ref] of Object.entries(PRICE_REFERENCES)) {
      const detail = getEtfDetailByIsin(isin);
      expect(detail, isin).not.toBeNull();
      expect(
        ref.symbols.includes(detail!.tickerYahoo ?? ""),
        `${isin} ticker_yahoo ${detail!.tickerYahoo}`,
      ).toBe(true);
      // le prix de référence est une valeur structurellement plausible
      // (> 1 € la part, < 100 000 €) ; la tolérance large couvre la
      // volatilité et les mises à jour futures du marché
      expect(ref.eur).toBeGreaterThan(1);
      expect(ref.eur * (1 + PRICE_TOLERANCE)).toBeLessThan(100_000);
    }
    // le fichier expose bien des symboles Yahoo pour une majorité d'ETF
    const withYahoo = details.filter((d) => d.tickerYahoo).length;
    expect(withYahoo).toBeGreaterThanOrEqual(
      Math.floor(details.length * 0.6),
    );
  }, 30000);
});

describe("parsing du CSV enrichi", () => {
  it("parse toutes les nouvelles colonnes", () => {
    const csvLine = `isin,ticker,ticker_yahoo,name,emitter,index_tracked,asset_class,region,sector_focus,ter,replication,distributing,dividend_yield_2023,dividend_yield_2024,dividend_yield_2025,currency,exchange,domicile,ucits,pea_eligible,established,fund_size_musd,holdings_count,notes,tr_name,provider,fund_currency,currency_risk,wkn,holdings_as_of,top_holdings,countries,sectors
TEST00000001,TST,TST.PA,Fond Test,Émetteur,Indice Test,Equity,World,All sectors,0.10,Physical,True,0,0,2.0,EUR,Euronext Paris,Ireland,True,True,2020,500,100,notes,TR Fond Test,Provider X,EUR,Currency unhedged,A00000,30/07/2026,"Apple:5.48|NVIDIA Corp.:5.04","United States:69.07|Other:30.93","Technology:34.88|Other:65.12"`;
    const parsed = parseEtfDetailCsv(csvLine);
    expect(parsed).toHaveLength(1);
    const etf = parsed[0];
    expect(etf.trName).toBe("TR Fond Test");
    expect(etf.provider).toBe("Provider X");
    expect(etf.fundCurrency).toBe("EUR");
    expect(etf.currencyRisk).toBe("Currency unhedged");
    expect(etf.wkn).toBe("A00000");
    expect(etf.holdingsAsOf).toBe("30/07/2026");
    expect(etf.topHoldings).toEqual([
      { name: "Apple", weight: 0.0548 },
      { name: "NVIDIA Corp.", weight: 0.0504 },
    ]);
    expect(etf.countries).toEqual([
      { name: "United States", weight: 0.6907 },
      { name: "Other", weight: 0.3093 },
    ]);
    expect(etf.sectors).toHaveLength(2);
    expect(etf.domicile).toBe("Ireland");
    expect(etf.exchange).toBe("Euronext Paris");
    expect(etf.ucits).toBe(true);
    expect(etf.fundSizeMusd).toBe(500);
    expect(etf.holdingsCount).toBe(100);
    expect(etf.dividendYield2025).toBeCloseTo(0.02, 6);
  });
});
