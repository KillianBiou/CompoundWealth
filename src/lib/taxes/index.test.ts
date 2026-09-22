import { describe, expect, it } from "vitest";
import {
  ENVELOPE_RULES,
  PEA_DEPOSIT_CAP_CENTS,
  peaAntiquity,
} from "./index";

describe("ENVELOPE_RULES", () => {
  it("PEA : plafond de versements 150 000 € en centimes", () => {
    expect(PEA_DEPOSIT_CAP_CENTS).toBe(15_000_000);
    expect(ENVELOPE_RULES.PEA.depositCapCents).toBe(15_000_000);
  });
  it("PEA : flat tax avant 5 ans = 12,8 % IR + 18,6 % PS", () => {
    expect(ENVELOPE_RULES.PEA.flatTax).toBeCloseTo(0.314, 3);
  });
  it("PEA : exonération d'IR après 5 ans", () => {
    expect(ENVELOPE_RULES.PEA.incomeTaxAfter5Years).toBe(0);
  });
  it("CTO : sans plafond, flat tax constante", () => {
    expect(ENVELOPE_RULES.CTO.depositCapCents).toBeNull();
    expect(ENVELOPE_RULES.CTO.incomeTaxAfter5Years).toBeCloseTo(0.128, 3);
    expect(ENVELOPE_RULES.CTO.incomeTaxAfter5Years).toBe(
      ENVELOPE_RULES.CTO.incomeTaxBefore5Years,
    );
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
