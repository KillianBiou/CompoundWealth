import { describe, expect, it } from "vitest";
import {
  ENVELOPE_RULES,
  FLAT_TAX_2026,
  PEA_DEPOSIT_CAP_CENTS,
  peaAntiquity,
} from "./index";

describe("ENVELOPE_RULES", () => {
  it("PEA : plafond de versements 150 000 € en centimes", () => {
    expect(PEA_DEPOSIT_CAP_CENTS).toBe(15_000_000);
    expect(ENVELOPE_RULES.PEA.depositCapCents).toBe(15_000_000);
  });

  it("la flat tax 31,4 % est la SOMME d'IR et de PS, pas une addition en plus", () => {
    expect(FLAT_TAX_2026).toBeCloseTo(0.314, 3);
    for (const rules of [ENVELOPE_RULES.PEA, ENVELOPE_RULES.CTO]) {
      expect(rules.flatTax).toBeCloseTo(0.314, 3);
      expect(rules.incomeTaxBefore5Years + rules.socialLevies).toBeCloseTo(
        rules.flatTax,
        10,
      );
      const sum = rules.flatTaxBreakdown.reduce((s, b) => s + b.rate, 0);
      expect(sum).toBeCloseTo(rules.flatTax, 10);
      expect(rules.flatTaxBreakdown).toHaveLength(2);
      expect(rules.flatTaxBreakdown[0].label).toBe("Impôt sur le revenu");
      expect(rules.flatTaxBreakdown[1].label).toBe("Prélèvements sociaux");
    }
  });

  it("PEA : exonération d'IR après 5 ans, PS restent dus", () => {
    expect(ENVELOPE_RULES.PEA.incomeTaxAfter5Years).toBe(0);
    expect(ENVELOPE_RULES.PEA.incomeTaxIsDurationBased).toBe(true);
    expect(ENVELOPE_RULES.PEA.socialLevies).toBeCloseTo(0.186, 3);
  });

  it("CTO : sans plafond, flat tax constante dans le temps", () => {
    expect(ENVELOPE_RULES.CTO.depositCapCents).toBeNull();
    expect(ENVELOPE_RULES.CTO.incomeTaxAfter5Years).toBeCloseTo(0.128, 3);
    expect(ENVELOPE_RULES.CTO.incomeTaxAfter5Years).toBe(
      ENVELOPE_RULES.CTO.incomeTaxBefore5Years,
    );
    expect(ENVELOPE_RULES.CTO.incomeTaxIsDurationBased).toBe(false);
  });

  it("les badges PEA mentionnent la flat tax avant 5 ans et l'exonération ensuite", () => {
    expect(ENVELOPE_RULES.PEA.badges[0]).toContain("31,4 %");
    expect(ENVELOPE_RULES.PEA.badges[1]).toContain("Exonération");
  });
});

describe("peaAntiquity", () => {
  it("antériorité non acquise avant 5 ans", () => {
    const openedAt = new Date("2024-06-01");
    const now = new Date("2026-09-22");
    const status = peaAntiquity(openedAt, now);
    expect(status.acquired).toBe(false);
    expect(status.yearsRemaining).toBeGreaterThan(0);
  });
  it("antériorité restante décomptée en années pleines, pas arrondie au plafond", () => {
    const openedAt = new Date("2025-09-25");
    const now = new Date("2026-10-01");
    const status = peaAntiquity(openedAt, now);
    expect(status.acquired).toBe(false);
    expect(status.yearsRemaining).toBe(3);
    expect(status.remainingLabel).toBe("3 ans et 11 mois restants");
  });
  it("antériorité restante : moins d'un an affiche les mois", () => {
    const openedAt = new Date("2022-09-25");
    const now = new Date("2026-10-01");
    const status = peaAntiquity(openedAt, now);
    expect(status.acquired).toBe(false);
    expect(status.yearsRemaining).toBe(0);
    expect(status.remainingLabel).toBe("11 mois restants");
  });
  it("antériorité restante : moins d'un mois affiche les jours", () => {
    const openedAt = new Date("2021-10-15");
    const now = new Date("2026-10-01");
    const status = peaAntiquity(openedAt, now);
    expect(status.acquired).toBe(false);
    expect(status.yearsRemaining).toBe(0);
    expect(status.remainingLabel).toBe("14 jours restants");
  });
  it("antériorité acquise après 5 ans", () => {
    const openedAt = new Date("2020-06-01");
    const now = new Date("2026-09-22");
    const status = peaAntiquity(openedAt, now);
    expect(status.acquired).toBe(true);
    expect(status.yearsRemaining).toBe(0);
  });
  it("date anniversaire correcte", () => {
    const openedAt = new Date("2024-06-01");
    const status = peaAntiquity(openedAt, new Date("2026-09-22"));
    expect(status.anniversaryDate.getFullYear()).toBe(2029);
    expect(status.anniversaryDate.getMonth()).toBe(5);
  });
});
