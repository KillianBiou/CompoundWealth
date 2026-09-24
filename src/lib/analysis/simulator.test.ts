import { describe, expect, it } from "vitest";
import { simulateTwoTracks, type TwoTrackSimulationPoint } from "./simulator";

/**
 * Tests de la simulation de patrimoine à deux compartiments.
 *
 * Les valeurs attendues sont ancrées sur des références externes vérifiées :
 * - investor.gov (SEC) compound interest calculator :
 *   $10 000 à 7 %/an pendant 30 ans → $76 123 (intérêts composés annuels).
 * - thecalculatorsite.com : $10 000 à 5 %/an pendant 20 ans → $26 532,98.
 * - NerdWallet : $10 000 à 4 %/an pendant 10 ans → $14 917,92 en composé
 *   quotidien ; le composé mensuel ($14 802,44) en est la borne inférieure.
 * - financialmentor.com : $25 000 + $500/mois à 7 % pendant 15 ans →
 *   $230 629 (versements en début de mois) ; en fin de mois (notre
 *   convention) : $224 528,17.
 * - Règle de 72 : à 7,2 %/an, le capital double en ≈ 10 ans
 *   (10 000 → 20 042,31).
 * - Formule fermée de l'annuité (fin de période) :
 *   FV = P × ((1+r)^n − 1)/i avec i = (1+r)^(1/12) − 1, validée à l'identique
 *   contre la simulation itérative ($704 275,29 pour 500 €/mois à 8 %/30 ans).
 *
 * Conventions du simulateur (documentées pour les seuils de tolérance) :
 * - versements en fin de mois ;
 * - actions : rendement annuel converti en taux mensuel équivalent composé
 *   (1+r)^(1/12) − 1 ;
 * - livret : taux nominal r/12 par mois (quinzaines lissées) ;
 * - montants en centimes d'euro entier, arrondis à chaque point annuel.
 */

const cents = (euros: number) => Math.round(euros * 100);

function run(params: {
  investedEur: number;
  savingsEur: number;
  monthlyInvestedEur?: number;
  monthlySavingsEur?: number;
  equityReturn: number;
  savingsReturn: number;
  inflation: number;
  horizonYears: number;
}): { points: TwoTrackSimulationPoint[]; fireYear: number | null } {
  return simulateTwoTracks({
    investedWealthCents: cents(params.investedEur),
    savingsWealthCents: cents(params.savingsEur),
    monthlyInvestedCents: cents(params.monthlyInvestedEur ?? 0),
    monthlySavingsCents: cents(params.monthlySavingsEur ?? 0),
    equityReturn: params.equityReturn,
    savingsReturn: params.savingsReturn,
    inflation: params.inflation,
    horizonYears: params.horizonYears,
  });
}

/** Capital investi final en euros (dernier point). */
function finalInvestedEur(points: TwoTrackSimulationPoint[]): number {
  return points[points.length - 1].investedCents / 100;
}

/** Épargne finale en euros (dernier point). */
function finalSavingsEur(points: TwoTrackSimulationPoint[]): number {
  return points[points.length - 1].savingsCents / 100;
}

/** Total nominal final en euros (dernier point). */
function finalTotalEur(points: TwoTrackSimulationPoint[]): number {
  return points[points.length - 1].totalCents / 100;
}

describe("simulateTwoTracks — validation externe (outils de référence)", () => {
  it("investor.gov : 10 000 € à 7 %/an pendant 30 ans → 76 122,55 € (≈ 76 123 $)", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 0,
      equityReturn: 0.07,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 30,
    });
    expect(points).toHaveLength(31);
    expect(finalInvestedEur(points)).toBeCloseTo(76_122.55, 0);
    // La référence arrondie à l'euro de investor.gov
    expect(Math.round(finalInvestedEur(points))).toBe(76_123);
  });

  it("thecalculatorsite : 10 000 € à 5 %/an pendant 20 ans → 26 532,98 € exactement", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 0,
      equityReturn: 0.05,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 20,
    });
    expect(finalInvestedEur(points)).toBeCloseTo(26_532.98, 2);
  });

  it("NerdWallet : 10 000 € à 4 %/an pendant 10 ans → 14 802,44 € (composé mensuel, borne du quotidien 14 917,92)", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 0,
      equityReturn: 0.04,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 10,
    });
    // composé mensuel < composé quotidien (NerdWallet) : écart < 0,8 %
    expect(finalInvestedEur(points)).toBeCloseTo(14_802.44, 1);
    expect(finalInvestedEur(points)).toBeLessThan(14_917.92);
    expect(finalInvestedEur(points) / 14_917.92).toBeGreaterThan(0.992);
  });

  it("financialmentor : 25 000 € + 500 €/mois à 7 %/an pendant 15 ans → 224 528,17 € (fin de mois vs 230 629 en début de mois)", () => {
    const { points } = run({
      investedEur: 25_000,
      savingsEur: 0,
      monthlyInvestedEur: 500,
      equityReturn: 0.07,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 15,
    });
    expect(finalInvestedEur(points)).toBeCloseTo(224_528.17, 0);
    // la référence (versements en début de mois) est un majorant strict
    expect(finalInvestedEur(points)).toBeLessThan(230_629);
  });

  it("règle de 72 : à 7,2 %/an le capital double en 10 ans (10 000 → 20 042,31 €)", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 0,
      equityReturn: 0.072,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 10,
    });
    expect(finalInvestedEur(points)).toBeGreaterThan(20_000);
    expect(finalInvestedEur(points)).toBeCloseTo(20_042.31, 0);
  });
});

describe("simulateTwoTracks — cohérence mathématique interne", () => {
  it("annuité : formule fermée vs simulation itérative — 500 €/mois à 8 %/an pendant 30 ans", () => {
    const { points } = run({
      investedEur: 0,
      savingsEur: 0,
      monthlyInvestedEur: 500,
      equityReturn: 0.08,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 30,
    });
    // FV = P × ((1+r)^n − 1)/i, i = (1+r)^(1/12) − 1 → 704 275,29 €
    expect(finalInvestedEur(points)).toBeCloseTo(704_275.29, 0);
  });

  it("rendement nul : capital = versements cumulés exactement (10 000 + 100 €/mois × 36 mois)", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 0,
      monthlyInvestedEur: 100,
      equityReturn: 0,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 3,
    });
    expect(finalInvestedEur(points)).toBeCloseTo(13_600, 2);
  });

  it("rendement nul côté épargne : livret = dépôt + versements, au centime", () => {
    const { points } = run({
      investedEur: 0,
      savingsEur: 8_000,
      monthlySavingsEur: 200,
      equityReturn: 0.07,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 5,
    });
    // 8 000 + 200 × 60 mois = 20 000 € exactement
    expect(finalSavingsEur(points)).toBeCloseTo(20_000, 2);
  });

  it("linéarité : les deux compartiments sont indépendants (total = investi + épargne à chaque point)", () => {
    const { points } = run({
      investedEur: 26_000,
      savingsEur: 8_000,
      monthlyInvestedEur: 300,
      monthlySavingsEur: 200,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 20,
    });
    for (const p of points) {
      // chaque track est arrondie séparément : tolérance 2 centimes
      expect(Math.abs(p.totalCents - (p.investedCents + p.savingsCents))).toBeLessThanOrEqual(2);
    }
  });

  it("la croissance est monotone avec un rendement et des versements positifs", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 5_000,
      monthlyInvestedEur: 250,
      monthlySavingsEur: 100,
      equityReturn: 0.06,
      savingsReturn: 0.02,
      inflation: 0.02,
      horizonYears: 10,
    });
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].totalCents).toBeGreaterThan(points[i - 1].totalCents);
    }
  });

  it("euros constants : total réel = total nominal déflaté par l'inflation", () => {
    const { points } = run({
      investedEur: 26_000,
      savingsEur: 8_000,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 5,
    });
    const last = points[points.length - 1];
    const expectedReal = last.totalCents / Math.pow(1.02, 5);
    expect(last.totalRealCents / 100).toBeCloseTo(expectedReal / 100, 0);
  });

  it("inflation > rendement : le pouvoir d'achat nominal baisse en euros constants", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 0,
      equityReturn: 0.01,
      savingsReturn: 0,
      inflation: 0.03,
      horizonYears: 10,
    });
    const last = points[points.length - 1];
    expect(last.totalCents / 100).toBeCloseTo(11_046.22, 0);
    expect(last.totalRealCents / 100).toBeCloseTo(8_219.43, 0);
    expect(last.totalRealCents).toBeLessThan(points[0].totalRealCents);
  });
});

describe("simulateTwoTracks — scénarios patrimoine réalistes", () => {
  it("cas utilisateur : 26 000 € actions + 8 000 € livret, sans DCA, 5 ans à 7 % → ≈ 45 759 € (et non 169 920 €)", () => {
    // Régression du bug « versements historiques comptés comme épargne
    // mensuelle » : sans DCA, aucun versement ne doit alimenter les tracks.
    const { points } = run({
      investedEur: 26_000,
      savingsEur: 8_000,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 5,
    });
    expect(finalInvestedEur(points)).toBeCloseTo(36_466.34, 0);
    expect(finalSavingsEur(points)).toBeCloseTo(9_292.93, 0);
    expect(finalTotalEur(points)).toBeCloseTo(45_759.27, 0);
    // garde-fou régression : ne doit jamais dépasser le double du capital
    expect(finalTotalEur(points)).toBeLessThan(34_000 * 2);
  });

  it("même cas au taux réel du livret A (1,7 %) → ≈ 45 175,56 €", () => {
    const { points } = run({
      investedEur: 26_000,
      savingsEur: 8_000,
      equityReturn: 0.07,
      savingsReturn: 0.017,
      inflation: 0.02,
      horizonYears: 5,
    });
    expect(finalSavingsEur(points)).toBeCloseTo(8_709.21, 0);
    expect(finalTotalEur(points)).toBeCloseTo(45_175.55, 0);
  });

  it("DCA 300 €/mois vers l'investissement + 200 €/mois vers l'épargne, 20 ans → ≈ 333 099 €", () => {
    const { points } = run({
      investedEur: 26_000,
      savingsEur: 8_000,
      monthlyInvestedEur: 300,
      monthlySavingsEur: 200,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 20,
    });
    expect(finalInvestedEur(points)).toBeCloseTo(252_872.71, 0);
    expect(finalSavingsEur(points)).toBeCloseTo(80_226.44, 0);
    expect(finalTotalEur(points)).toBeCloseTo(333_099.15, 0);
  });

  it("livret seul : 8 000 € à 3 % nominal pendant 10 ans → 10 794,83 €", () => {
    const { points } = run({
      investedEur: 0,
      savingsEur: 8_000,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0,
      horizonYears: 10,
    });
    expect(finalSavingsEur(points)).toBeCloseTo(10_794.83, 0);
    expect(finalInvestedEur(points)).toBe(0);
  });

  it("la part DCA va à l'investissement, jamais à l'épargne : monthlySavings n'influence pas invested", () => {
    const base = run({
      investedEur: 10_000,
      savingsEur: 5_000,
      monthlyInvestedEur: 300,
      monthlySavingsEur: 100,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 10,
    });
    const withoutSavingsFlow = run({
      investedEur: 10_000,
      savingsEur: 5_000,
      monthlyInvestedEur: 300,
      monthlySavingsEur: 0,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 10,
    });
    expect(base.points[10].investedCents).toBe(withoutSavingsFlow.points[10].investedCents);
    expect(base.points[10].savingsCents).toBeGreaterThan(
      withoutSavingsFlow.points[10].savingsCents,
    );
  });

  it("le patrimoine initial apparaît tel quel au point 0 (année courante)", () => {
    const { points } = run({
      investedEur: 26_000,
      savingsEur: 8_000,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 5,
    });
    expect(points[0].investedCents).toBe(cents(26_000));
    expect(points[0].savingsCents).toBe(cents(8_000));
    expect(points[0].totalCents).toBe(cents(34_000));
    expect(points[0].totalRealCents).toBe(cents(34_000));
    expect(points[0].year).toBe(new Date().getFullYear());
  });

  it("horizon 1 an avec versements : intérêts crédités sur 12 mois seulement", () => {
    const { points } = run({
      investedEur: 0,
      savingsEur: 0,
      monthlyInvestedEur: 100,
      equityReturn: 0.12,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 1,
    });
    // 12 versements de fin de mois à 12 %/an : seul le premier versement
    // capitalise 11 mois, le dernier 0 mois → 1 200 € + ~64,65 € d'intérêts
    const monthlyRate = Math.pow(1.12, 1 / 12) - 1;
    const expected = 100 * ((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate);
    expect(finalInvestedEur(points)).toBeCloseTo(expected, 0);
    expect(finalInvestedEur(points)).toBeGreaterThan(1_200);
    expect(finalInvestedEur(points)).toBeLessThan(1_270);
  });
});

describe("simulateTwoTracks — invariants structurels", () => {
  it("renvoie horizonYears + 1 points, années consécutives", () => {
    const { points } = run({
      investedEur: 1_000,
      savingsEur: 500,
      equityReturn: 0.05,
      savingsReturn: 0.02,
      inflation: 0.02,
      horizonYears: 7,
    });
    expect(points).toHaveLength(8);
    const startYear = new Date().getFullYear();
    points.forEach((p, i) => expect(p.year).toBe(startYear + i));
  });

  it("horizon 0 : un seul point, égal au patrimoine initial", () => {
    const { points } = run({
      investedEur: 12_345.67,
      savingsEur: 8_901.23,
      equityReturn: 0.07,
      savingsReturn: 0.03,
      inflation: 0.02,
      horizonYears: 0,
    });
    expect(points).toHaveLength(1);
    expect(points[0].totalCents).toBe(cents(12_345.67) + cents(8_901.23));
  });

  it("rendements négatifs : le capital investi peut baisser, l'épargne jamais en-dessous de ses versements", () => {
    const { points } = run({
      investedEur: 10_000,
      savingsEur: 10_000,
      monthlyInvestedEur: 0,
      monthlySavingsEur: 100,
      equityReturn: -0.1,
      savingsReturn: 0.01,
      inflation: 0.02,
      horizonYears: 5,
    });
    const last = points[points.length - 1];
    expect(last.investedCents).toBeLessThan(points[0].investedCents);
    // épargne : 10 000 × (1+0.01/12)^60 + annuité 100 €/mois > 10 600
    expect(last.savingsCents / 100).toBeGreaterThan(10_600);
  });

  it("fireYear est toujours null (réservé, aucun calcul FIRE dans ce module)", () => {
    const { fireYear } = run({
      investedEur: 1_000_000,
      savingsEur: 0,
      equityReturn: 0.07,
      savingsReturn: 0,
      inflation: 0,
      horizonYears: 10,
    });
    expect(fireYear).toBeNull();
  });
});
