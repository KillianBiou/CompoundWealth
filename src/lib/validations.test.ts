import { describe, expect, it } from "vitest";
import {
  envelopeSchema,
  positionSchema,
  profileSchema,
  signupSchema,
  valuationSchema,
} from "./validations";

describe("signupSchema", () => {
  it("accepte un email et mot de passe valides", () => {
    const r = signupSchema.safeParse({ email: "a@b.fr", password: "12345678" });
    expect(r.success).toBe(true);
  });
  it("rejette un mot de passe trop court", () => {
    const r = signupSchema.safeParse({ email: "a@b.fr", password: "1234" });
    expect(r.success).toBe(false);
  });
  it("rejette un email invalide", () => {
    const r = signupSchema.safeParse({ email: "pas-un-email", password: "12345678" });
    expect(r.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepte des champs vides (profil optionnel)", () => {
    const r = profileSchema.safeParse({ name: "", age: "", job: "", salaryEur: "" });
    expect(r.success).toBe(true);
  });
  it("rejette un âge hors bornes", () => {
    expect(profileSchema.safeParse({ age: 12 }).success).toBe(false);
    expect(profileSchema.safeParse({ age: 130 }).success).toBe(false);
    expect(profileSchema.safeParse({ age: 32 }).success).toBe(true);
  });
});

describe("envelopeSchema", () => {
  it("exige un nom", () => {
    const r = envelopeSchema.safeParse({ type: "PEA", name: "  " });
    expect(r.success).toBe(false);
  });
  it("accepte PEA sans date d'ouverture", () => {
    const r = envelopeSchema.safeParse({ type: "PEA", name: "PEA Bourse" });
    expect(r.success).toBe(true);
  });
  it("rejette un type inconnu", () => {
    const r = envelopeSchema.safeParse({ type: "AV", name: "X" });
    expect(r.success).toBe(false);
  });
});

describe("positionSchema", () => {
  it("exige un montant strictement positif quand il est fourni", () => {
    const base = { name: "CW8", category: "ETF", boughtAt: "2026-01-15" };
    expect(positionSchema.safeParse({ ...base, investedEur: 0 }).success).toBe(false);
    expect(positionSchema.safeParse({ ...base, investedEur: 100.5 }).success).toBe(true);
  });
  it("état des lieux : sans montant investi, quantité x prix unitaire requis", () => {
    const base = { name: "CW8", category: "ETF", boughtAt: "2026-01-15" };
    expect(positionSchema.safeParse({ ...base }).success).toBe(false);
    expect(
      positionSchema.safeParse({ ...base, quantity: 12, unitPriceEur: 70.5 }).success,
    ).toBe(true);
  });
  it("quantité x prix sans montant investi est valide (snapshot)", () => {
    const r = positionSchema.safeParse({
      name: "CW8",
      category: "ETF",
      boughtAt: "2026-09-01",
      quantity: 12,
      unitPriceEur: 70.5,
    });
    expect(r.success).toBe(true);
  });
  it("rejette une date d'achat future", () => {
    const r = positionSchema.safeParse({
      name: "CW8",
      category: "ETF",
      investedEur: 100,
      boughtAt: "2099-01-01",
    });
    expect(r.success).toBe(false);
  });
  it("accepte une quantité optionnelle quand le montant est fourni", () => {
    const r = positionSchema.safeParse({
      name: "AAPL",
      category: "STOCK",
      investedEur: 500,
      boughtAt: "2026-01-02",
      quantity: "",
    });
    expect(r.success).toBe(true);
  });
});

describe("valuationSchema", () => {
  it("rejette une date future", () => {
    const r = valuationSchema.safeParse({ date: "2099-01-01", valueEur: 100 });
    expect(r.success).toBe(false);
  });
  it("accepte 0 comme valeur", () => {
    const r = valuationSchema.safeParse({ date: "2026-01-01", valueEur: 0 });
    expect(r.success).toBe(true);
  });
});
