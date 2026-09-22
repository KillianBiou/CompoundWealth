import { describe, expect, it } from "vitest";
import {
  ETF_CATALOG,
  getEtfByIsin,
  searchEtfCatalog,
} from "./etf-catalog";

describe("ETF_CATALOG", () => {
  it("ne contient que des ISIN uniques et valides", () => {
    const isins = ETF_CATALOG.map((e) => e.isin);
    expect(new Set(isins).size).toBe(ETF_CATALOG.length);
    for (const isin of isins) {
      expect(isin).toMatch(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/);
    }
  });
  it("ne contient que des ETF français (éligibles PEA)", () => {
    expect(ETF_CATALOG.every((e) => e.ter > 0 && e.ter < 0.01)).toBe(true);
    expect(ETF_CATALOG.every((e) => e.ticker.length > 0)).toBe(true);
  });
});

describe("searchEtfCatalog", () => {
  it("trouve par ticker insensible à la casse", () => {
    const r = searchEtfCatalog("cw8");
    expect(r.map((e) => e.ticker)).toContain("CW8");
  });
  it("trouve par ISIN exact", () => {
    const r = searchEtfCatalog("lu1681043599");
    expect(r.length).toBe(1);
    expect(r[0].ticker).toBe("CW8");
  });
  it("trouve par nom (accents ignorés)", () => {
    const r = searchEtfCatalog("stoxx");
    expect(r.map((e) => e.ticker)).toContain("ETZ");
  });
  it("trouve par catégorie", () => {
    const r = searchEtfCatalog("monde");
    expect(r.length).toBeGreaterThanOrEqual(3);
  });
  it("ne renvoie rien pour une requête vide", () => {
    expect(searchEtfCatalog("  ")).toEqual([]);
  });
});

describe("getEtfByIsin", () => {
  it("renvoie l'ETF pour un ISIN connu (insensible à la casse)", () => {
    const etf = getEtfByIsin("fr0011550185");
    expect(etf?.ticker).toBe("ESE");
  });
  it("renvoie null pour un ISIN inconnu", () => {
    expect(getEtfByIsin("US0378331005")).toBeNull();
  });
});
