import { describe, expect, it } from "vitest";
import {
  createDcaSchema,
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
describe("createDcaSchema", () => {
  const base = {
    frequency: "MONTHLY" as const,
    startDate: "2026-10-02",
    lines: [{ isin: "LU1681043599", maxAmountEur: 1500 }],
  };
  it("accepte un plan valide avec plusieurs lignes", () => {
    const result = createDcaSchema.safeParse({
      ...base,
      lines: [
        { isin: "LU1681043599", maxAmountEur: 1500 },
        { isin: "FR001400U5Q4", maxAmountEur: 500 },
      ],
    });
    expect(result.success).toBe(true);
  });
  it("accepte les quatre périodicités", () => {
    for (const frequency of ["BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY"] as const) {
      expect(createDcaSchema.safeParse({ ...base, frequency }).success).toBe(true);
    }
  });
  it("rejette une périodicité inconnue", () => {
    expect(createDcaSchema.safeParse({ ...base, frequency: "WEEKLY" }).success).toBe(false);
  });
  it("accepte une date de départ future", () => {
    expect(createDcaSchema.safeParse({ ...base, startDate: "2099-01-01" }).success).toBe(true);
  });
  it("rejette une liste vide", () => {
    expect(createDcaSchema.safeParse({ ...base, lines: [] }).success).toBe(false);
  });
  it("rejette un montant nul ou négatif", () => {
    expect(
      createDcaSchema.safeParse({ ...base, lines: [{ isin: "LU1681043599", maxAmountEur: 0 }] })
        .success,
    ).toBe(false);
  });
  it("rejette un ISIN hors catalog", () => {
    expect(
      createDcaSchema.safeParse({ ...base, lines: [{ isin: "US0378331005", maxAmountEur: 100 }] })
        .success,
    ).toBe(false);
  });
  it("rejette les doublons de titre avec l'index de la ligne", () => {
    const result = createDcaSchema.safeParse({
      ...base,
      lines: [
        { isin: "LU1681043599", maxAmountEur: 1500 },
        { isin: "LU1681043599", maxAmountEur: 500 },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "Ce titre est déjà dans la liste")).toBe(
        true,
      );
    }
  });
});
