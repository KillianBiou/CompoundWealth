import { describe, expect, it } from "vitest";
import { getEtfByIsin, searchEtfCatalog } from "@/lib/etf-catalog";
import { getEtfDetailByIsin } from "@/lib/analysis/etf-detail";
import { ENVELOPE_RULES } from "@/lib/taxes";

describe("fonds non cotés (ELTIF)", () => {
  it("catalogue : Apollo et EQT présents, privés, sans symbole Yahoo", () => {
    const apollo = getEtfByIsin("LU3170240538");
    const eqt = getEtfByIsin("LU3176111881");
    expect(apollo?.isPrivate).toBe(true);
    expect(apollo?.yahooSymbol).toBeNull();
    expect(apollo?.indexCategory).toBe("Non coté");
    expect(eqt?.isPrivate).toBe(true);
    expect(eqt?.ter).toBeCloseTo(0.0235, 5);
  });

  it("recherche par nom et ISIN les trouve", () => {
    expect(searchEtfCatalog("apollo").map((e) => e.ticker)).toContain("APOLLO");
    expect(searchEtfCatalog("LU3176111881").map((e) => e.ticker)).toContain("EQT");
    expect(searchEtfCatalog("non cote").map((e) => e.isin)).toContain("LU3170240538");
  });

  it("détails CSV : AIFM, frais, liquidité chargés", () => {
    const apollo = getEtfDetailByIsin("LU3170240538");
    const eqt = getEtfDetailByIsin("LU3176111881");
    expect(apollo?.ter).toBeCloseTo(0.028, 5);
    expect(apollo?.emitter).toContain("Apollo");
    expect(apollo?.exchange).toContain("Non cote");
    expect(apollo?.userHolding).toBe(true);
    expect(eqt?.ter).toBeCloseTo(0.0235, 5);
    expect(eqt?.userHolding).toBe(true);
  });

  it("règles fiscales PRIV : flat tax de droit commun, sans plafond", () => {
    const rules = ENVELOPE_RULES.PRIV;
    expect(rules.flatTax).toBeCloseTo(0.314, 3);
    expect(rules.incomeTaxAfter5Years).toBeCloseTo(0.128, 3);
    expect(rules.depositCapCents).toBeNull();
    expect(rules.badges.join(" ")).toContain("liquidité");
  });
});
