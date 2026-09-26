import { describe, expect, it } from "vitest";
import {
  computeGoalMetrics,
  isCapitalizedGoal,
  monthsBetween,
  projectCapital,
  requiredAnnualReturn,
  requiredMonthlySavings,
  requiredTrajectoryAt,
  buildGoalMonthlySeries,
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

  it("rendement requis > seuil réaliste → compromis", () => {
    // 100 000 € actuels, cible 1 M€ dans 10 ans, sans contribution :
    // r = 10^(1/10)−1 ≈ 25,9 % ≫ réaliste → compromis
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
    expect(m.status).toBe("compromised");
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
    expect(m.status).toBe("compromised");
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
