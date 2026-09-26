import { describe, expect, it } from "vitest";
import {
  computeGoalMetrics,
  goalFeasibility,
  isShortHorizonConcern,
  monthsToFillGoal,
  isCapitalizedGoal,
  monthsBetween,
  projectCapital,
  requiredAnnualReturn,
  requiredMonthlySavings,
  requiredTrajectoryAt,
  buildGoalMonthlySeries,
  safetyNetLevel,
  DEFAULT_SAFETY_NET_MONTHS,
  DEFAULT_WITHDRAWAL_RATE,
  SAFETY_NET_ALERT_MONTHS,
  SAFETY_NET_EXCESS_FACTOR,
  OVERFUNDED_FACTOR,
  type GoalType,
} from "./progress";

const NOW = new Date(2026, 8, 25); // 25 septembre 2026, minuit local

/* -------------------------------------------------------------------------- */
/*                      1. Progression par type                                */
/* -------------------------------------------------------------------------- */

describe("progression par type de but", () => {
  it("matelas : 6 000 € de liquidités, 1 500 €/mois de dépenses, cible 6 mois → 4,0 mois couverts", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 600_000,
      targetMonths: 6,
      monthlyExpensesCents: 150_000,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsCovered).toBeCloseTo(4.0, 10);
    expect(m.progress).toBeCloseTo(4 / 6, 10);
    expect(m.displayProgress).toBeCloseTo(4 / 6, 10);
    expect(m.status).toBe("onTrack");
    expect(m.capitalTargetCents).toBe(900_000);
  });

  it("matelas mode montant : cible 15 000 € directe, sans dépenses", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 6_000_000 / 10,
      targetAmountCents: 1_500_000,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsCovered).toBeNull();
    expect(m.capitalTargetCents).toBe(1_500_000);
    expect(m.progress).toBeCloseTo(0.4, 10);
    expect(m.status).toBe("onTrack");
  });

  it("matelas mode montant : atteint et surfinancé fonctionnent", () => {
    const achieved = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 1_500_000,
      targetAmountCents: 1_500_000,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(achieved.status).toBe("achieved");
    const over = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 2_400_000,
      targetAmountCents: 1_500_000,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(over.status).toBe("overfunded");
  });

  it("matelas : cible par défaut 6 mois si targetMonths absent", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 600_000,
      monthlyExpensesCents: 100_000,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsCovered).toBeCloseTo(6, 10);
    expect(m.progress).toBeCloseTo(1, 10);
    expect(m.status).toBe("achieved");
  });

  it("FIRE : 127 200 € × 4 % / 12 → rente exacte 424 €/mois", () => {
    const m = computeGoalMetrics({
      type: "FIRE",
      linkedValueCents: 12_720_000,
      targetRentCents: 85_000,
      withdrawalRate: 0.04,
      createdAt: new Date(2025, 0, 1),
      targetDate: new Date(2046, 0, 1),
      now: NOW,
    });
    expect(m.currentRentCents).toBe(42_400);
    expect(m.capitalTargetCents).toBe(25_500_000); // 850 × 12 / 0,04
    expect(m.progress).toBeCloseTo(12_720_000 / 25_500_000, 10);
  });

  it("FIRE : capital cible nul si rente absente → statut onTrack sans crash", () => {
    const m = computeGoalMetrics({
      type: "FIRE",
      linkedValueCents: 500_000,
      withdrawalRate: 0.04,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.capitalTargetCents).toBeNull();
    expect(m.status).toBe("onTrack");
  });

  it("capital : 18 200 € / 60 000 € → 30,33 % de progression", () => {
    const m = computeGoalMetrics({
      type: "DOWN_PAYMENT",
      linkedValueCents: 1_820_000,
      targetAmountCents: 6_000_000,
      createdAt: new Date(2025, 0, 1),
      targetDate: new Date(2029, 0, 1),
      now: NOW,
    });
    expect(m.progress).toBeCloseTo(1_820_000 / 6_000_000, 10);
    expect(m.displayProgress).toBeCloseTo(0.3033333, 6);
  });
});

/* -------------------------------------------------------------------------- */
/*                      2-3. Rendement requis                                  */
/* -------------------------------------------------------------------------- */

describe("requiredAnnualReturn", () => {
  it("cas fermé sans contribution : 50 000 € → 100 000 € en 10 ans → 7,177 %", () => {
    const r = requiredAnnualReturn(5_000_000, 10_000_000, 10, 0);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(Math.pow(2, 1 / 10) - 1, 10);
    expect(r!).toBeCloseTo(0.0717735, 6);
  });

  it("cas avec contributions : vérification par substitution (35 000 €, 500 €/mois, 500 000 €, 20 ans)", () => {
    const r = requiredAnnualReturn(3_500_000, 50_000_000, 20, 50_000);
    expect(r).not.toBeNull();
    expect(r!).toBeGreaterThan(0);
    expect(r!).toBeLessThan(0.3);
    // substitution : la projection au taux trouvé atteint la cible ± 1 €
    const growth = Math.pow(1 + r!, 20);
    const projected =
      3_500_000 * growth + 50_000 * 12 * ((growth - 1) / r!);
    expect(Math.abs(projected - 50_000_000)).toBeLessThan(100);
  });

  it("retourne null si la cible est inatteignable même à 30 %/an", () => {
    expect(requiredAnnualReturn(0, 10_000_000, 2, 1_000)).toBeNull();
  });

  it("retourne null si capital nul sans contribution", () => {
    expect(requiredAnnualReturn(0, 10_000_000, 10, 0)).toBeNull();
  });

  it("bornes : années ≤ 0 ou cible ≤ 0 → null", () => {
    expect(requiredAnnualReturn(100, 0, 10, 0)).toBeNull();
    expect(requiredAnnualReturn(100, 1000, 0, 0)).toBeNull();
    expect(requiredAnnualReturn(100, 1000, -1, 0)).toBeNull();
  });

  it("cible déjà atteinte : rendement requis nul ou négatif, pas de crash", () => {
    // 100 € actuels, cible 90 €, 10 ans, sans contribution → r ≈ −1 %
    const r = requiredAnnualReturn(10_000, 9_000, 10, 0);
    expect(r).not.toBeNull();
    expect(r!).toBeLessThan(0);
  });

  it("atteignable sans rendement avec contributions → rendement requis ≤ 0", () => {
    // 100 €/mois × 12 × 10 ans = 12 000 € > cible 10 000 €
    const r = requiredAnnualReturn(0, 1_000_000, 10, 10_000);
    expect(r).not.toBeNull();
    expect(r!).toBeLessThanOrEqual(0);
  });
});

describe("requiredMonthlySavings", () => {
  it("inversion exacte de la formule : vérification par substitution", () => {
    const m = requiredMonthlySavings(1_000_000, 5_000_000, 10, 0.05);
    expect(m).not.toBeNull();
    const growth = Math.pow(1.05, 10);
    const annuity = m! * 12 * ((growth - 1) / 0.05);
    const projected = 1_000_000 * growth + annuity;
    // la cible est atteinte au centime près (au plus 1 mois de contribution d'écart)
    expect(projected).toBeGreaterThanOrEqual(5_000_000);
    expect(projected - 5_000_000).toBeLessThan(m!);
  });

  it("capital déjà suffisant → 0", () => {
    expect(requiredMonthlySavings(6_000_000, 5_000_000, 10, 0.05)).toBe(0);
  });

  it("taux nul : épargne plate répartie sur les mois", () => {
    const m = requiredMonthlySavings(0, 12_000_000, 10, 0);
    expect(m).toBe(100_000); // 120 000 € sur 120 mois
  });
});

/* -------------------------------------------------------------------------- */
/*                      4-5. Machine à statuts                                 */
/* -------------------------------------------------------------------------- */

describe("machine à statuts", () => {
  const base = {
    createdAt: new Date(2024, 0, 1),
    targetDate: new Date(2030, 0, 1),
    now: NOW,
  };

  it("progression exactement 1 → atteint", () => {
    const m = computeGoalMetrics({
      ...base,
      type: "DOWN_PAYMENT",
      linkedValueCents: 6_000_000,
      targetAmountCents: 6_000_000,
    });
    expect(m.status).toBe("achieved");
  });

  it("progression ≥ 1,5 → surfinancé", () => {
    const m = computeGoalMetrics({
      ...base,
      type: "DOWN_PAYMENT",
      linkedValueCents: 9_000_000,
      targetAmountCents: 6_000_000,
    });
    expect(m.progress).toBeCloseTo(1.5, 10);
    expect(m.status).toBe("overfunded");
  });

  it("date cible passée, progression < 1 → en retard même à 99 %", () => {
    const m = computeGoalMetrics({
      type: "DOWN_PAYMENT",
      linkedValueCents: 5_940_000,
      targetAmountCents: 6_000_000,
      createdAt: new Date(2020, 0, 1),
      targetDate: new Date(2026, 0, 1),
      now: NOW,
    });
    expect(m.progress).toBeCloseTo(0.99, 4);
    expect(m.status).toBe("late");
  });

  it("FIRE : au rythme actuel le but dépasse la date cible → late, pas onTrack", () => {
    // rente 16 000 €/mois à 4 % → capital 4,8 M€ ; 25 184,95 € actuels,
    // 1 500 €/mois, échéance dans ~23 ans : la projection à 8 % reste
    // très loin de la cible → « Sur la bonne voie » serait faux
    const m = computeGoalMetrics({
      type: "FIRE",
      linkedValueCents: 2_518_495,
      targetRentCents: 1_600_000,
      withdrawalRate: 0.04,
      monthlyContributionCents: 150_000,
      createdAt: new Date(2026, 8, 26),
      targetDate: new Date(2050, 0, 1),
      expectedReturn: 0.08,
      now: new Date(2026, 8, 26),
    });
    expect(m.status).toBe("late");
  });

  it("FIRE : projection qui tient la date cible → onTrack", () => {
    // 450 000 € actuels + 3 000 €/mois à 8 % pendant ~23 ans
    // → ~5,05 M€ ≥ capital cible 4,8 M€
    const m = computeGoalMetrics({
      type: "FIRE",
      linkedValueCents: 45_000_000,
      targetRentCents: 1_600_000,
      withdrawalRate: 0.04,
      monthlyContributionCents: 300_000,
      createdAt: new Date(2026, 8, 26),
      targetDate: new Date(2050, 0, 1),
      expectedReturn: 0.08,
      now: new Date(2026, 8, 26),
    });
    expect(["onTrack", "surplus"]).toContain(m.status);
  });

  it("rendement requis > réaliste avec date cible → en retard (même sémantique que FIRE)", () => {
    // 100 000 € actuels, cible 1 M€ dans ~10 ans, sans contribution :
    // r ≈ 23,2 % ≫ réaliste — la projection à 8 % ne tient pas
    // la date cible → « late » (actionnable), pas « compromis »
    const m = computeGoalMetrics({
      type: "RETIREMENT",
      linkedValueCents: 10_000_000,
      targetAmountCents: 100_000_000,
      monthlyContributionCents: 0,
      createdAt: new Date(2024, 0, 1),
      targetDate: new Date(2036, 0, 1),
      expectedReturn: 0.08,
      now: NOW,
    });
    expect(m.requiredReturn).not.toBeNull();
    expect(m.requiredReturn!).toBeGreaterThan(m.realisticReturn!);
    expect(m.status).toBe("late");
  });

  it("cible inatteignable même à 30 %/an → compromis (requiredReturn null)", () => {
    // 1 000 € actuels + 100 €/mois, cible 100 000 € dans ~1,3 an : impossible
    const m = computeGoalMetrics({
      type: "RETIREMENT",
      linkedValueCents: 100_000,
      targetAmountCents: 10_000_000,
      monthlyContributionCents: 10_000,
      createdAt: new Date(2024, 0, 1),
      targetDate: new Date(2028, 0, 1),
      expectedReturn: 0.062,
      now: NOW,
    });
    expect(m.requiredReturn).toBeNull();
    expect(m.status).toBe("late");
  });

  it("rendement requis réaliste → bonne voie", () => {
    // 50 000 € → 100 000 € en ~9,3 ans : r ≈ 7,8 % ; attendu 10 % → réaliste 8 %
    const m = computeGoalMetrics({
      type: "RETIREMENT",
      linkedValueCents: 5_000_000,
      targetAmountCents: 10_000_000,
      monthlyContributionCents: 0,
      createdAt: new Date(2024, 0, 1),
      targetDate: new Date(2036, 0, 1),
      expectedReturn: 0.1,
      now: NOW,
    });
    expect(m.requiredReturn).not.toBeNull();
    expect(m.requiredReturn!).toBeLessThanOrEqual(m.realisticReturn!);
    expect(m.status).toBe("onTrack");
  });

  it("progression < trajectoire requise → sous-financé", () => {
    // créé il y a 2,74 ans, cible dans 1,28 ans : trajectoire ≈ 0,68
    // progression réelle 0,30 < 0,68, rendement requis réaliste
    const m = computeGoalMetrics({
      type: "DOWN_PAYMENT",
      linkedValueCents: 1_820_000,
      targetAmountCents: 6_000_000,
      monthlyContributionCents: 300_000, // 3 000 €/mois : rendement requis faible
      createdAt: new Date(2024, 0, 1),
      targetDate: new Date(2028, 0, 1),
      expectedReturn: 0.08,
      now: NOW,
    });
    expect(m.requiredTrajectory).toBeGreaterThan(0.5);
    expect(m.progress).toBeLessThan(m.requiredTrajectory);
    expect(m.status).toBe("underfunded");
  });

  it("SAFETY_NET : < 3 mois de couverture → alerte", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 200_000,
      monthlyExpensesCents: 150_000,
      targetMonths: 6,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsCovered!).toBeLessThan(SAFETY_NET_ALERT_MONTHS);
    expect(m.status).toBe("alert");
  });

  it("SAFETY_NET : couverture > cible × 1,5 → surfinancé (trop élevé)", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 1_200_000, // 12 mois de couverture à 100 k€/mois
      monthlyExpensesCents: 100_000,
      targetMonths: 6,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsCovered!).toBeGreaterThan(6 * SAFETY_NET_EXCESS_FACTOR);
    expect(m.status).toBe("overfunded");
  });

  it("projection au rendement réaliste dépasse la cible de > 10 % → excédentaire", () => {
    // 80 000 € à 6 % (réaliste = 8 % − 2 %) pendant 10 ans → ~143 k€ > 110 k€
    const m = computeGoalMetrics({
      type: "RETIREMENT",
      linkedValueCents: 8_000_000,
      targetAmountCents: 10_000_000,
      monthlyContributionCents: 0,
      createdAt: new Date(2026, 0, 1),
      targetDate: new Date(2036, 0, 1),
      expectedReturn: 0.08,
      now: new Date(2026, 0, 15),
    });
    expect(m.status).toBe("surplus");
    // un but dont le rendement requis dépasse le réaliste n'est jamais
    // excédentaire : compromis prime
    const m2 = computeGoalMetrics({
      type: "RETIREMENT",
      linkedValueCents: 5_000_000,
      targetAmountCents: 10_000_000,
      monthlyContributionCents: 0,
      createdAt: new Date(2026, 0, 1),
      targetDate: new Date(2036, 0, 1),
      expectedReturn: 0.08,
      now: new Date(2026, 0, 15),
    });
    expect(m2.requiredReturn!).toBeGreaterThan(m2.realisticReturn!);
    expect(m2.status).toBe("compromised");
  });

  it("isCapitalizedGoal : SAFETY_NET/FIRE non capitalisés, le reste oui", () => {
    const capitalized: GoalType[] = [
      "RETIREMENT",
      "DOWN_PAYMENT",
      "CUSTOM_LIFEVENT",
      "CUSTOM",
    ];
    for (const type of capitalized) {
      expect(isCapitalizedGoal(type)).toBe(true);
    }
    expect(isCapitalizedGoal("SAFETY_NET")).toBe(false);
    expect(isCapitalizedGoal("FIRE")).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/*                      7-8. Séries mensuelles & trajectoire                   */
/* -------------------------------------------------------------------------- */

describe("requiredTrajectoryAt", () => {
  const created = new Date(2024, 0, 1);
  const target = new Date(2028, 0, 1);

  it("0 à la création, 1 à la date cible, linéaire, clampée", () => {
    expect(requiredTrajectoryAt(created, target, created)).toBe(0);
    expect(requiredTrajectoryAt(created, target, target)).toBe(1);
    // moitié du parcours : ~mi-2026
    const mid = new Date(2026, 0, 2);
    expect(requiredTrajectoryAt(created, target, mid)).toBeGreaterThan(0.49);
    expect(requiredTrajectoryAt(created, target, mid)).toBeLessThan(0.51);
    // après la cible : clampée à 1
    expect(requiredTrajectoryAt(created, target, new Date(2030, 0, 1))).toBe(1);
    // avant la création : clampée à 0
    expect(requiredTrajectoryAt(created, target, new Date(2023, 0, 1))).toBe(0);
  });

  it("sans date cible : trajectoire 0 (pas d'échéance)", () => {
    expect(requiredTrajectoryAt(created, null, NOW)).toBe(0);
    expect(requiredTrajectoryAt(created, undefined, NOW)).toBe(0);
  });

  it("cible antérieure à la création : 1 d'emblée", () => {
    expect(
      requiredTrajectoryAt(created, new Date(2023, 0, 1), NOW),
    ).toBe(1);
  });
});

describe("buildGoalMonthlySeries", () => {
  const created = new Date(2025, 0, 1);

  it("échantillonne au dernier jour de chaque mois, interpolation plate", () => {
    const series = [
      { date: new Date(2025, 0, 15), valueCents: 100_000 },
      { date: new Date(2025, 2, 10), valueCents: 300_000 },
      { date: new Date(2025, 5, 20), valueCents: 600_000 },
    ];
    const points = buildGoalMonthlySeries({
      type: "CUSTOM",
      targetAmountCents: 1_000_000,
      createdAt: created,
      series,
      now: new Date(2025, 6, 15),
    });
    expect(points.length).toBeGreaterThanOrEqual(7);
    // fin janvier : 100 k€ connus (interpolation plate)
    const jan = points.find((p) => p.date.getMonth() === 0);
    expect(jan?.valueCents).toBe(100_000);
    expect(jan?.metric).toBeCloseTo(0.1, 6);
    // fin février : toujours 100 k€ (pas de nouveau point avant mars)
    const feb = points.find((p) => p.date.getMonth() === 1);
    expect(feb?.valueCents).toBe(100_000);
    // fin avril : 300 k€
    const apr = points.find((p) => p.date.getMonth() === 3);
    expect(apr?.valueCents).toBe(300_000);
    // point courant = 600 k€
    const last = points[points.length - 1];
    expect(last.valueCents).toBe(600_000);
    expect(last.metric).toBeCloseTo(0.6, 6);
  });

  it("enveloppe inexistante avant sa première valuation : 0, jamais le premier point", () => {
    const series = [
      { date: new Date(2025, 4, 15), valueCents: 500_000 }, // ouverte en mai
    ];
    const points = buildGoalMonthlySeries({
      type: "CUSTOM",
      targetAmountCents: 1_000_000,
      createdAt: new Date(2025, 0, 1),
      series,
      now: new Date(2025, 6, 15),
    });
    const feb = points.find((p) => p.date.getMonth() === 1);
    expect(feb?.valueCents).toBe(0); // avant mai : l'enveloppe n'existait pas
    expect(feb?.metric).toBe(0);
    const jul = points[points.length - 1];
    expect(jul.valueCents).toBe(500_000);
  });

  it("SAFETY_NET : la métrique est le nombre de mois couverts", () => {
    const series = [
      { date: new Date(2025, 0, 15), valueCents: 300_000 },
      { date: new Date(2025, 3, 15), valueCents: 600_000 },
    ];
    const points = buildGoalMonthlySeries({
      type: "SAFETY_NET",
      targetMonths: 6,
      monthlyExpensesCents: 150_000,
      createdAt: created,
      series,
      now: new Date(2025, 5, 1),
    });
    const first = points[0];
    expect(first.metric).toBeCloseTo(2, 6); // 300 k / 150 k = 2 mois
    const last = points[points.length - 1];
    expect(last.metric).toBeCloseTo(4, 6); // 600 k / 150 k = 4 mois
  });

  it("FIRE : la métrique est la rente mensuelle en centimes", () => {
    const series = [{ date: new Date(2025, 0, 15), valueCents: 12_720_000 }];
    const points = buildGoalMonthlySeries({
      type: "FIRE",
      targetRentCents: 85_000,
      withdrawalRate: 0.04,
      createdAt: created,
      series,
      now: new Date(2025, 2, 1),
    });
    expect(points[0].metric).toBe(42_400); // 127 200 × 0,04 / 12
  });

  it("série vide → aucun point", () => {
    expect(
      buildGoalMonthlySeries({
        type: "CUSTOM",
        targetAmountCents: 100_000,
        createdAt: created,
        series: [],
        now: NOW,
      }),
    ).toEqual([]);
  });

  it("plusieurs enveloppes décalées : la somme est correcte à chaque mois", () => {
    const series = [
      { date: new Date(2025, 0, 10), valueCents: 100_000 },
      { date: new Date(2025, 2, 10), valueCents: 400_000 },
      { date: new Date(2025, 4, 10), valueCents: 700_000 },
    ];
    const points = buildGoalMonthlySeries({
      type: "CUSTOM",
      targetAmountCents: 1_000_000,
      createdAt: new Date(2025, 0, 1),
      series,
      now: new Date(2025, 6, 1),
    });
    const feb = points.find((p) => p.date.getMonth() === 1);
    expect(feb?.valueCents).toBe(100_000);
    const jun = points.find((p) => p.date.getMonth() === 5);
    expect(jun?.valueCents).toBe(700_000);
  });
});

/* -------------------------------------------------------------------------- */
/*                      Divers : projectCapital, monthsBetween                 */
/* -------------------------------------------------------------------------- */

describe("projectCapital", () => {
  it("capitalisation mensuelle : 0 € + 500 €/mois à 0 % → 6 000 € sur 1 an", () => {
    expect(projectCapital(0, 50_000, 0, 1)).toBe(600_000);
  });

  it("croissance composée cohérente avec simulateTwoTracks (rendement mensuel équivalent)", () => {
    // 10 000 € à 8 % pendant 1 an sans versement
    const projected = projectCapital(1_000_000, 0, 0.08, 1);
    const monthly = Math.pow(1.08, 1 / 12) - 1;
    let value = 1_000_000;
    for (let m = 0; m < 12; m += 1) value = value * (1 + monthly);
    expect(projected).toBe(Math.round(value));
  });

  it("années nulles : valeur inchangée", () => {
    expect(projectCapital(123_456, 50_000, 0.08, 0)).toBe(123_456);
  });
});

describe("monthsBetween", () => {
  it("12 mois entre deux mêmes dates (approx 30,44 j/mois, tolérance 2 %)", () => {
    expect(
      monthsBetween(new Date(2025, 0, 1), new Date(2026, 0, 1)),
    ).toBeCloseTo(12, 1);
  });
});

describe("constantes", () => {
  it("valeurs de référence de la spécification", () => {
    expect(DEFAULT_SAFETY_NET_MONTHS).toBe(6);
    expect(DEFAULT_WITHDRAWAL_RATE).toBe(0.04);
    expect(SAFETY_NET_ALERT_MONTHS).toBe(3);
    expect(SAFETY_NET_EXCESS_FACTOR).toBe(1.5);
    expect(OVERFUNDED_FACTOR).toBe(1.5);
  });
});

describe("monthsToFillGoal", () => {
  it("10 000 € à 500 €/mois sans rendement → 20 mois", () => {
    expect(monthsToFillGoal(0, 1_000_000, 50_000, 0)).toBe(20);
  });

  it("capital restant exact → mois entiers", () => {
    expect(monthsToFillGoal(500_000, 1_000_000, 50_000, 0)).toBe(10);
  });

  it("déjà atteint → 0 ; sans contribution ni rendement → null", () => {
    expect(monthsToFillGoal(1_000_000, 1_000_000, 50_000, 0)).toBe(0);
    expect(monthsToFillGoal(0, 1_000_000, 0, 0)).toBeNull();
  });

  it("avec rendement → moins de mois que sans rendement", () => {
    const flat = monthsToFillGoal(0, 2_000_000, 50_000, 0)!;
    const grown = monthsToFillGoal(0, 2_000_000, 50_000, 0.06)!;
    expect(grown!).toBeLessThan(flat!);
  });
});

describe("goalFeasibility — grille de scénarios", () => {
  it("pas de rendement requis (matelas, ou épargne seule suffit) → confortable", () => {
    expect(goalFeasibility(null, 0.06, 0.08)).toBe("comfortable");
    expect(goalFeasibility(0, 0.06, 0.08)).toBe("comfortable");
  });

  it("requis ≤ moitié de la moyenne bourse → confortable", () => {
    expect(goalFeasibility(0.03, 0.06, 0.08)).toBe("comfortable");
    expect(goalFeasibility(0.04, null, 0.08)).toBe("comfortable");
  });

  it("requis ≤ moyenne bourse (8 %) → atteignable", () => {
    expect(goalFeasibility(0.06, 0.06, 0.08)).toBe("achievable");
    expect(goalFeasibility(0.079, null, 0.08)).toBe("achievable");
  });

  it("requis > 8 % mais ≤ passé (ex. 9,57 % requis vs 15,91 % passés) → atteignable avec le passé", () => {
    expect(goalFeasibility(0.0957, 0.1591, 0.08)).toBe("achievableWithPast");
    expect(goalFeasibility(0.15, 0.1591, 0.08)).toBe("achievableWithPast");
  });

  it("requis > passé mais ≤ 1,25 × passé → exigeant (battre son propre historique)", () => {
    expect(goalFeasibility(0.17, 0.1591, 0.08)).toBe("demanding");
    expect(goalFeasibility(0.198, 0.1591, 0.08)).toBe("demanding");
  });

  it("requis > 1,25 × passé mais ≤ 2 × moyenne bourse → très difficile", () => {
    // passé décevant (4 %) : requis 10 % est au-delà du passé × 1,25
    // mais sous 16 % (2 × 8 %)
    expect(goalFeasibility(0.1, 0.04, 0.08)).toBe("hard");
    expect(goalFeasibility(0.16, null, 0.08)).toBe("hard");
  });

  it("requis > 2 × moyenne bourse → quasiment impossible", () => {
    expect(goalFeasibility(0.25, 0.12, 0.08)).toBe("extreme");
    expect(goalFeasibility(0.19, 0.04, 0.08)).toBe("extreme");
  });

  it("passé indisponible → comparaison à la moyenne bourse seule", () => {
    expect(goalFeasibility(0.05, null, 0.08)).toBe("achievable");
    expect(goalFeasibility(0.13, null, 0.08)).toBe("hard");
  });

  it("rendement réel nul ou négatif avec référence nulle → null", () => {
    expect(goalFeasibility(0.05, null, 0)).toBeNull();
  });
});

describe("isShortHorizonConcern", () => {
  it("horizon < 5 ans sur un niveau atteignable → sensible aux crashes", () => {
    expect(isShortHorizonConcern("achievable", 3)).toBe(true);
    expect(isShortHorizonConcern("achievableWithPast", 4.5)).toBe(true);
  });

  it("horizon long, niveau hors risque, ou null → pas d'avertissement", () => {
    expect(isShortHorizonConcern("achievable", 10)).toBe(false);
    expect(isShortHorizonConcern("extreme", 2)).toBe(false);
    expect(isShortHorizonConcern("comfortable", 2)).toBe(false);
    expect(isShortHorizonConcern(null, 2)).toBe(false);
    expect(isShortHorizonConcern("achievable", null)).toBe(false);
  });
});

describe("matelas : mois pour remplir (monthsToFill)", () => {
  it("6 000 € actuels, cible 15 000 €, 300 €/mois, livret 3 % → ~28 mois", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 600_000,
      targetAmountCents: 1_500_000,
      monthlyContributionCents: 30_000,
      cashReturn: 0.03,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsToFill).not.toBeNull();
    expect(m.monthsToFill!).toBeGreaterThan(25);
    expect(m.monthsToFill!).toBeLessThan(32);
  });

  it("sans contribution → null", () => {
    const m = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: 600_000,
      targetAmountCents: 1_500_000,
      createdAt: new Date(2025, 0, 1),
      now: NOW,
    });
    expect(m.monthsToFill).toBeNull();
  });
});

describe("FIRE : rendement requis", () => {
  it("capital cible, date cible et contribution → rendement requis calculé", () => {
    const m = computeGoalMetrics({
      type: "FIRE",
      linkedValueCents: 5_000_000,
      targetRentCents: 85_000,
      withdrawalRate: 0.04,
      monthlyContributionCents: 50_000,
      createdAt: new Date(2025, 0, 1),
      targetDate: new Date(2045, 0, 1),
      expectedReturn: 0.062,
      now: NOW,
    });
    // capital cible = 850 × 12 / 0,04 = 255 000 €, 50 000 € actuels, 500 €/mois, 20 ans
    expect(m.capitalTargetCents).toBe(25_500_000);
    expect(m.requiredReturn).not.toBeNull();
    expect(m.requiredReturn!).toBeGreaterThan(0.03);
    expect(m.requiredReturn!).toBeLessThan(0.05);
  });
});

describe("safetyNetLevel — échelle de précaution (matelas)", () => {
  it("mode réserve : < 1 mois couvert → très précaire", () => {
    expect(safetyNetLevel(0.5, 6, 0.08)).toBe("critical");
    expect(safetyNetLevel(0, 6, 0)).toBe("critical");
  });
  it("mode réserve : 1 à < 3 mois (zone d'alerte) → précaire", () => {
    expect(safetyNetLevel(1, 6, 0.17)).toBe("fragile");
    expect(safetyNetLevel(2.9, 6, 0.48)).toBe("fragile");
  });
  it("mode réserve : ≥ 3 mois mais < 50 % de la cible → partielle", () => {
    // cible 12 mois : 3 mois couverts = 25 % de la cible, zone « partielle »
    expect(safetyNetLevel(3, 12, 0.25)).toBe("partial");
    expect(safetyNetLevel(2.9, 12, 0.24)).not.toBe("partial"); // garde-fou : 2,9 est fragile
  });
  it("mode réserve : ≥ 50 % de la cible → en construction", () => {
    expect(safetyNetLevel(3.1, 6, 0.52)).toBe("building");
    expect(safetyNetLevel(5.9, 6, 0.98)).toBe("building");
  });
  it("mode réserve : cible atteinte → solide", () => {
    expect(safetyNetLevel(6, 6, 1)).toBe("robust");
    expect(safetyNetLevel(8.9, 6, 1.48)).toBe("robust");
  });
  it("mode réserve : > cible × 1,5 → excessive (liquidité dormante)", () => {
    expect(safetyNetLevel(9.1, 6, 1.52)).toBe("excess");
    expect(safetyNetLevel(12, 6, 2)).toBe("excess");
  });
  it("mode montant (pas de dépenses) : l'échelle retombe sur la progression", () => {
    expect(safetyNetLevel(null, null, 0.05)).toBe("critical");
    expect(safetyNetLevel(null, null, 0.15)).toBe("fragile");
    expect(safetyNetLevel(null, null, 0.3)).toBe("partial");
    expect(safetyNetLevel(null, null, 0.6)).toBe("building");
    expect(safetyNetLevel(null, null, 1)).toBe("robust");
    expect(safetyNetLevel(null, null, 1.6)).toBe("excess");
  });
  it("mode montant avec cible en mois mais pas de dépenses : progression seule", () => {
    expect(safetyNetLevel(null, 6, 0.3)).toBe("partial");
  });
});

describe("buts capitalisés : échéance anticipée (même sémantique que FIRE)", () => {
  it("retraite : projection à 8 % qui ne tient pas la date → late", () => {
    // 25 000 € actuels, 500 €/mois, cible 300 000 € dans ~10,3 ans :
    // projection ≈ 130 k€ ≪ 300 k€
    const m = computeGoalMetrics({
      type: "RETIREMENT",
      linkedValueCents: 2_500_000,
      targetAmountCents: 30_000_000,
      monthlyContributionCents: 50_000,
      createdAt: new Date(2026, 8, 26),
      targetDate: new Date(2036, 0, 1),
      expectedReturn: 0.08,
      now: new Date(2026, 8, 26),
    });
    expect(m.status).toBe("late");
  });
  it("apport immobilier : projection qui tient la date → onTrack", () => {
    // 65 000 € + 400 €/mois à 8 % pendant ~4,3 ans → ~115 k€ ≥ 100 k€,
    // rendement requis ~4,2 % < réaliste (6 %) → ni compromis ni en retard
    const m = computeGoalMetrics({
      type: "DOWN_PAYMENT",
      linkedValueCents: 6_500_000,
      targetAmountCents: 10_000_000,
      monthlyContributionCents: 40_000,
      createdAt: new Date(2026, 8, 26),
      targetDate: new Date(2031, 0, 1),
      expectedReturn: 0.08,
      now: new Date(2026, 8, 26),
    });
    expect(m.status).toBe("onTrack");
  });
  it("sans contribution ni rendement : pas de late automatique (rien à projeter)", () => {
    const m = computeGoalMetrics({
      type: "CUSTOM",
      linkedValueCents: 1_000_000,
      targetAmountCents: 10_000_000,
      monthlyContributionCents: 0,
      createdAt: new Date(2026, 8, 26),
      targetDate: new Date(2030, 0, 1),
      expectedReturn: 0,
      now: new Date(2026, 8, 26),
    });
    // rendement requis null (inatteignable), pas de projection possible → compromis
    expect(m.status).toBe("compromised");
  });
});
