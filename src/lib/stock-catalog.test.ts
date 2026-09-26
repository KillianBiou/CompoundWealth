import { describe, expect, it } from "vitest";
import {
  STOCK_CATALOG,
  searchSecurities,
  getSecurityByIsin,
  getSecurityBySymbol,
} from "./stock-catalog";

describe("STOCK_CATALOG", () => {
  it("contient les actions phares avec ISIN unique", () => {
    const isins = STOCK_CATALOG.map((s) => s.isin);
    expect(new Set(isins).size).toBe(STOCK_CATALOG.length);
    for (const isin of isins) {
      expect(isin).toMatch(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/);
    }
    expect(isins).toContain("US67066G1040");
    expect(isins).toContain("FR0000121014");
  });
  it("inclut SpaceX (SPCX) cotée depuis son IPO", () => {
    expect(STOCK_CATALOG.find((s) => s.ticker === "SPCX")?.isin).toBe(
      "US84615Q1031",
    );
  });
});

describe("searchSecurities", () => {
  it("trouve NVIDIA par nom, ticker et ISIN", () => {
    expect(searchSecurities("nvidia").map((s) => s.ticker)).toContain("NVDA");
    expect(searchSecurities("nvda").map((s) => s.ticker)).toContain("NVDA");
    expect(searchSecurities("us67066g1040").map((s) => s.ticker)).toContain(
      "NVDA",
    );
  });
  it("trouve les ETF comme avant (CW8)", () => {
    expect(searchSecurities("cw8").map((s) => s.ticker)).toContain("CW8");
  });
  it("mélange ETF et actions dans les résultats", () => {
    const results = searchSecurities("monde");
    expect(results.some((s) => s.isin === "LU1681043599")).toBe(true);
  });
  it("ne renvoie rien pour une requête vide", () => {
    expect(searchSecurities("   ")).toEqual([]);
  });
});

describe("getSecurityByIsin", () => {
  it("résout un ETF du catalogue", () => {
    expect(getSecurityByIsin("LU1681043599")?.ticker).toBe("CW8");
    expect(getSecurityByIsin("LU1681043599")?.currency).toBe("EUR");
  });
  it("résout une action par ISIN (insensible à la casse)", () => {
    const nvda = getSecurityByIsin("us67066g1040");
    expect(nvda?.ticker).toBe("NVDA");
    expect(nvda?.name).toBe("NVIDIA");
    expect(nvda?.currency).toBe("USD");
  });
  it("renvoie null pour un ISIN inconnu", () => {
    expect(getSecurityByIsin("US0378331005")?.ticker).toBe("AAPL");
    expect(getSecurityByIsin("ZZ0000000000")).toBeNull();
  });
});

describe("getSecurityBySymbol", () => {
  it("résout un ticker ETF", () => {
    expect(getSecurityBySymbol("CW8")?.isin).toBe("LU1681043599");
  });
  it("résout un ticker action", () => {
    expect(getSecurityBySymbol("NVDA")?.isin).toBe("US67066G1040");
  });
  it("résout un ISIN stocké dans symbol (import Trade Republic)", () => {
    expect(getSecurityBySymbol("US67066G1040")?.ticker).toBe("NVDA");
  });
  it("renvoie null pour un symbole inconnu", () => {
    expect(getSecurityBySymbol("INCONNU")).toBeNull();
  });
});
