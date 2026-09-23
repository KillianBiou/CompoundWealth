import { describe, expect, it } from "vitest";
import {
  centsToEuros,
  eurosToCents,
  formatEurCents,
  formatEurCentsCompact,
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

import {
  CURRENCIES,
  NUMBER_LOCALES,
  formatMoneyCents,
  formatMoneyCentsCompact,
} from "./money";

describe("formatMoneyCents", () => {
  it("formate à la française par défaut (espaces + virgule)", () => {
    const formatted = formatMoneyCents(123_456_789);
    expect(formatted).toMatch(/^1[\s\u202f]234[\s\u202f]567,89[\s\u00a0]€$/);
  });

  it("formate en anglais (virgules + point)", () => {
    expect(formatMoneyCents(123_456_789, "USD", "en")).toBe("$1,234,567.89");
  });

  it("change de devise", () => {
    expect(formatMoneyCents(50_000, "GBP", "fr")).toContain("£");
    expect(formatMoneyCents(50_000, "CHF", "en")).toContain("CHF");
  });
});

describe("formatMoneyCentsCompact", () => {
  it("formate en compact selon la locale", () => {
    const fr = formatMoneyCentsCompact(12_345_678_900, "EUR", "fr");
    expect(fr).toMatch(/M/);
    const en = formatMoneyCentsCompact(12_345_678_900, "EUR", "en");
    expect(en).toMatch(/M/);
  });

  it("varie selon la locale", () => {
    const fr = formatMoneyCentsCompact(12_345_678_900, "EUR", "fr");
    const en = formatMoneyCentsCompact(12_345_678_900, "EUR", "en");
    expect(fr).not.toBe(en);
  });
});

describe("préférences", () => {
  it("exposent les devises et locales supportées", () => {
    expect(CURRENCIES.map((c) => c.code)).toContain("EUR");
    expect(NUMBER_LOCALES.map((l) => l.code)).toEqual(["fr", "en"]);
  });
});

describe("formatEurCentsCompact (déterministe, sans ICU compact)", () => {
  it("affiche 12 k€ pour 1 200 € — identique serveur/client (pas d'ICU)", () => {
    expect(formatEurCentsCompact(1_200_000)).toBe("12 k€");
  });
  it("affiche 1 440 € sous 10 000 € avec séparateur fin", () => {
    expect(formatEurCentsCompact(144_000)).toBe("1\u202f440 €");
  });
  it("affiche 172,8 k€ avec décimale utile", () => {
    expect(formatEurCentsCompact(17_280_000)).toBe("172,8 k€");
  });
  it("affiche 1,5 M€ au-delà du million", () => {
    expect(formatEurCentsCompact(150_000_000)).toBe("1,5 M€");
  });
  it("gère les négatifs", () => {
    expect(formatEurCentsCompact(-1_200_000)).toBe("−12 k€");
  });
});
