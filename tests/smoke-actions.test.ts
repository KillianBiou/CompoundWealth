import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  parseActionDetailCsv,
  getAllActionDetails,
  getActionDetailBySymbol,
} from "@/lib/analysis/action-detail";

const CSV_CONTENT = fs.readFileSync("data/actionDetail.csv", "utf8");

describe("CSV des 105 actions (actionDetail.csv)", () => {
  it("parse les 105 actions du fichier réel du dépôt", () => {
    const details = parseActionDetailCsv(CSV_CONTENT);
    expect(details.length).toBeGreaterThanOrEqual(100);
  });

  it("champs clés présents et cohérents (NVDA)", () => {
    const nvda = getActionDetailBySymbol("NVDA");
    expect(nvda).not.toBeNull();
    expect(nvda!.name).toBe("NVIDIA");
    expect(nvda!.isin).toBe("US67066G1040");
    expect(nvda!.currency).toBe("USD");
    expect(nvda!.sector).toBe("Technology");
    expect(nvda!.industry).toBe("Semiconductors");
    expect(nvda!.price).not.toBeNull();
    expect(nvda!.price!).toBeGreaterThan(0);
    expect(nvda!.marketCap).not.toBeNull();
    expect(nvda!.marketCap!).toBeGreaterThan(1_000_000_000_000);
    expect(nvda!.trailingPe).not.toBeNull();
    expect(nvda!.trailingPe!).toBeGreaterThan(5);
    expect(nvda!.businessSummary.length).toBeGreaterThan(100);
  });

  it("résout par ISIN aussi bien que par ticker Yahoo", () => {
    expect(getActionDetailBySymbol("US67066G1040")?.tickerYahoo).toBe("NVDA");
    expect(getActionDetailBySymbol("aapl")?.tickerYahoo).toBe("AAPL");
    expect(getActionDetailBySymbol("INCONNU.XX")).toBeNull();
  });

  it("symboles internationaux chargés avec leur devise", () => {
    const mc = getActionDetailBySymbol("MC.PA");
    expect(mc?.currency).toBe("EUR");
    const roche = getActionDetailBySymbol("ROP.SW");
    expect(roche?.currency).toBe("CHF");
    const samsung = getActionDetailBySymbol("005930.KS");
    expect(samsung?.currency).toBe("KRW");
  });

  it("rendement du dividende converti en fraction", () => {
    const ko = getActionDetailBySymbol("KO");
    expect(ko?.dividendYield).not.toBeNull();
    expect(ko!.dividendYield!).toBeGreaterThan(0.001);
    expect(ko!.dividendYield!).toBeLessThan(0.1);
  });

  it("traçabilité : date de dernière mise à jour présente sur chaque ligne", () => {
    const details = getAllActionDetails();
    const undated = details.filter((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d.dataAsOf));
    expect(undated).toHaveLength(0);
    expect(details[0].dataAsOf).toBe("2026-09-25");
  });

  it("SpaceX (SPCX) présente avec ses identifiants NASDAQ", () => {
    const spcx = getActionDetailBySymbol("SPCX");
    expect(spcx).not.toBeNull();
    expect(spcx!.isin).toBe("US84615Q1031");
    expect(spcx!.currency).toBe("USD");
    expect(spcx!.sector).toBe("Industrials");
    expect(spcx!.industry).toBe("Aerospace & Defense");
    expect(spcx!.price).toBe(148.03);
    expect(spcx!.marketCap).toBeGreaterThan(1_000_000_000_000);
    expect(spcx!.fiftyTwoWeekHigh).toBe(225.64);
    expect(spcx!.businessSummary.length).toBeGreaterThan(100);
    expect(spcx!.notes.length).toBeGreaterThan(50);
  });
  it("aucune ligne sans prix ni capitalisation", () => {
    const details = getAllActionDetails();
    const withoutPrice = details.filter((d) => d.price === null || d.price <= 0);
    const withoutCap = details.filter((d) => d.marketCap === null || d.marketCap <= 0);
    expect(withoutPrice).toHaveLength(0);
    expect(withoutCap).toHaveLength(0);
  });
});
