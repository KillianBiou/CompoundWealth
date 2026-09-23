import { describe, expect, it } from "vitest";
import {
  depositsSchema,
  envelopeSchema,
  positionSchema,
  profileSchema,
  signupSchema,
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
  const base = { isin: "LU1681043599", boughtAt: "2026-01-15" };
  it("accepte un ISIN du catalog avec un nombre de parts positif", () => {
    expect(
      positionSchema.safeParse({ ...base, quantity: 12.5 }).success,
    ).toBe(true);
  });
  it("rejette un ISIN hors catalog", () => {
    expect(
      positionSchema.safeParse({ ...base, isin: "US0378331005", quantity: 10 }).success,
    ).toBe(false);
  });
  it("rejette un nombre de parts nul ou négatif", () => {
    expect(positionSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(positionSchema.safeParse({ ...base, quantity: -10 }).success).toBe(false);
  });
  it("rejette une date future", () => {
    expect(
      positionSchema.safeParse({ ...base, quantity: 10, boughtAt: "2099-01-01" })
        .success,
    ).toBe(false);
  });
});

describe("depositsSchema", () => {
  it("rejette un montant négatif", () => {
    expect(depositsSchema.safeParse({ depositsEur: -100 }).success).toBe(false);
  });
  it("accepte 0 comme montant", () => {
    expect(depositsSchema.safeParse({ depositsEur: 0 }).success).toBe(true);
  });
  it("rejette un montant au-delà du plafond", () => {
    expect(depositsSchema.safeParse({ depositsEur: 500_001 }).success).toBe(false);
  });
});
