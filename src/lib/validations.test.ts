import { describe, expect, it } from "vitest";
import {
  goalSchema,
  createDcaSchema,
  createLivretDcaSchema,
  livretSettingsSchema,
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

describe("createLivretDcaSchema", () => {
  it("valide un versement mensuel", () => {
    const parsed = createLivretDcaSchema.safeParse({
      frequency: "MONTHLY",
      startDate: "2026-03-10",
      maxAmountEur: 200,
    });
    expect(parsed.success).toBe(true);
  });
  it("rejette un montant nul", () => {
    const parsed = createLivretDcaSchema.safeParse({
      frequency: "MONTHLY",
      startDate: "2026-03-10",
      maxAmountEur: 0,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("livretSettingsSchema", () => {
  it("accepte des taux exprimés en pourcentage (1.5)", () => {
    const parsed = livretSettingsSchema.safeParse({
      interestRate: 1.5,
      inflationRate: 2,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.interestRate).toBe(1.5);
  });
  it("rejette un taux peu plausible (> 15 %)", () => {
    const parsed = livretSettingsSchema.safeParse({
      interestRate: 25,
      inflationRate: 2,
    });
    expect(parsed.success).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*                                  goalSchema                                 */
/* -------------------------------------------------------------------------- */

describe("goalSchema", () => {
  it("accepte un matelas complet (durée + dépenses)", () => {
    const r = goalSchema.safeParse({
      type: "SAFETY_NET",
      name: "Matelas de sécurité",
      targetMonths: 6,
      monthlyExpensesEur: 1500,
      envelopeIds: ["env1"],
    });
    expect(r.success).toBe(true);
  });

  it("matelas : montant cible seul (mode montant) → valide", () => {
    const r = goalSchema.safeParse({
      type: "SAFETY_NET",
      name: "Matelas",
      targetAmountEur: 15000,
      envelopeIds: [],
    });
    expect(r.success).toBe(true);
  });

  it("matelas : champs vides (chaînes vides du FormData) → pas d'erreur withdrawalRate (bug coercition)", () => {
    // régression : withdrawalRate="" coercé en 0 rejetait la création d'un matelas
    const r = goalSchema.safeParse({
      type: "SAFETY_NET",
      name: "Matelas",
      icon: "SAFETY_NET",
      targetMonths: "6",
      monthlyExpensesEur: "1500",
      envelopeIds: [],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.withdrawalRate).toBeUndefined();
    }
  });

  it("matelas sans dépenses mensuelles → erreur explicite", () => {
    const r = goalSchema.safeParse({
      type: "SAFETY_NET",
      name: "Matelas",
      targetMonths: 6,
      envelopeIds: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === "monthlyExpensesEur")).toBe(true);
    }
  });

  it("matelas : durée hors bornes 3-12 mois → erreur", () => {
    expect(
      goalSchema.safeParse({
        type: "SAFETY_NET",
        name: "M",
        targetMonths: 2,
        monthlyExpensesEur: 1000,
        envelopeIds: [],
      }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({
        type: "SAFETY_NET",
        name: "M",
        targetMonths: 13,
        monthlyExpensesEur: 1000,
        envelopeIds: [],
      }).success,
    ).toBe(false);
  });

  it("FIRE exige rente + date cible", () => {
    const ok = goalSchema.safeParse({
      type: "FIRE",
      name: "Rente",
      targetRentEur: 850,
      targetDate: "2046-09-01",
      withdrawalRate: 0.04,
      envelopeIds: ["e1"],
    });
    expect(ok.success).toBe(true);
    const noRent = goalSchema.safeParse({
      type: "FIRE",
      name: "Rente",
      targetDate: "2046-09-01",
      envelopeIds: [],
    });
    expect(noRent.success).toBe(false);
    const pastDate = goalSchema.safeParse({
      type: "FIRE",
      name: "Rente",
      targetRentEur: 850,
      targetDate: "2020-01-01",
      envelopeIds: [],
    });
    expect(pastDate.success).toBe(false);
  });

  it("taux de retrait hors 2-10 % → erreur", () => {
    expect(
      goalSchema.safeParse({
        type: "FIRE",
        name: "R",
        targetRentEur: 850,
        targetDate: "2046-09-01",
        withdrawalRate: 0.01,
        envelopeIds: [],
      }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({
        type: "FIRE",
        name: "R",
        targetRentEur: 850,
        targetDate: "2046-09-01",
        withdrawalRate: 0.15,
        envelopeIds: [],
      }).success,
    ).toBe(false);
  });

  it("DOWN_PAYMENT exige montant + date", () => {
    expect(
      goalSchema.safeParse({
        type: "DOWN_PAYMENT",
        name: "Apport",
        targetAmountEur: 60000,
        envelopeIds: [],
      }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({
        type: "DOWN_PAYMENT",
        name: "Apport",
        targetAmountEur: 60000,
        targetDate: "2029-06-01",
        envelopeIds: [],
      }).success,
    ).toBe(true);
  });

  it("CUSTOM accepte un montant sans date", () => {
    expect(
      goalSchema.safeParse({
        type: "CUSTOM",
        name: "Personnel",
        targetAmountEur: 10000,
        envelopeIds: [],
      }).success,
    ).toBe(true);
  });

  it("nom vide ou trop long → erreur", () => {
    expect(
      goalSchema.safeParse({
        type: "CUSTOM",
        name: "   ",
        targetAmountEur: 100,
        envelopeIds: [],
      }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({
        type: "CUSTOM",
        name: "x".repeat(81),
        targetAmountEur: 100,
        envelopeIds: [],
      }).success,
    ).toBe(false);
  });

  it("type inconnu → erreur", () => {
    expect(
      goalSchema.safeParse({
        type: "INVALID",
        name: "X",
        targetAmountEur: 100,
        envelopeIds: [],
      }).success,
    ).toBe(false);
  });

  it("contribution mensuelle négative → erreur, zéro accepté", () => {
    expect(
      goalSchema.safeParse({
        type: "CUSTOM",
        name: "X",
        targetAmountEur: 100,
        monthlyContributionEur: -5,
        envelopeIds: [],
      }).success,
    ).toBe(false);
    expect(
      goalSchema.safeParse({
        type: "CUSTOM",
        name: "X",
        targetAmountEur: 100,
        monthlyContributionEur: 0,
        envelopeIds: [],
      }).success,
    ).toBe(true);
  });
});
