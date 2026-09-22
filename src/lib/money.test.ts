import { describe, expect, it } from "vitest";
import {
  centsToEuros,
  eurosToCents,
  formatEurCents,
  formatPercent,
} from "./money";

describe("eurosToCents", () => {
  it("convertit un nombre décimal en centimes", () => {
    expect(eurosToCents(123.45)).toBe(12345);
  });
  it("accepte une chaîne avec virgule française", () => {
    expect(eurosToCents("1 234,56")).toBe(123456);
  });
  it("retourne NaN pour une entrée invalide", () => {
    expect(Number.isNaN(eurosToCents("abc"))).toBe(true);
  });
  it("arrondit les demi-centimes", () => {
    expect(eurosToCents(0.005)).toBe(1);
    expect(eurosToCents(10.999)).toBe(1100);
  });
});

describe("centsToEuros", () => {
  it("formate en chaîne à 2 décimales", () => {
    expect(centsToEuros(12345)).toBe("123.45");
  });
});

describe("formatEurCents", () => {
  it("affiche le symbole euro", () => {
    expect(formatEurCents(12345)).toContain("€");
    expect(formatEurCents(12345)).toContain("123");
  });
});

describe("formatPercent", () => {
  it("préfixe les valeurs positives", () => {
    expect(formatPercent(0.12)).toMatch(/^\+/);
  });
  it("ne préfixe pas les valeurs négatives", () => {
    expect(formatPercent(-0.05)).toMatch(/^-/);
  });
});
