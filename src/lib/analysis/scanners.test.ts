import { describe, expect, it } from "vitest";
import {
  analyzeFees,
  analyzeIncome,
  analyzeRegions,
  analyzeSectors,
  averageMonthlySavings,
  estimateMonthlyExpenses,
  simulateWealth,
  type AnalysisPosition,
} from "./scanners";
import { ETF_EXPOSURES, getEtfExposureByIsin } from "./exposure-catalog";
import { getActionDetailBySymbol } from "./action-detail";

const now = new Date("2026-09-24T12:00:00Z");

function makePosition(overrides: Partial<AnalysisPosition> = {}): AnalysisPosition {
  return {
    id: "pos-1",
    name: "MSCI World Swap PEA",
    isin: "IE0002XZSHO1",
    symbol: null,
    envelopeId: "env-1",
    envelopeName: "PEA Trade Republic",
    envelopeType: "PEA",
    category: "ETF",
    valueCents: 100_000_00,
    investedCents: 90_000_00,
    ter: 0.002,
    boughtAt: new Date("2025-09-25"),
    investments: [{ date: new Date("2025-09-25"), amountCents: 90_000_00 }],
    cashIncomeCents: [],
    isStock: false,
    ...overrides,
  };
}

describe("exposure-catalog", () => {
  it("couvre tous les ETF du catalogue d'exposition avec des poids qui somment à ~1", () => {
    for (const exposure of ETF_EXPOSURES) {
      const sectorSum = exposure.sectors.reduce((s, x) => s + x.weight, 0);
      expect(sectorSum).toBeGreaterThan(0.85);
      expect(sectorSum).toBeLessThanOrEqual(1.001);
      const regionSum = exposure.regions.reduce((s, x) => s + x.weight, 0);
      expect(regionSum).toBeGreaterThan(0.9);
      expect(regionSum).toBeLessThanOrEqual(1.001);
    }
  });

  it("retrouve l'exposition par ISIN, insensible à la casse", () => {
    expect(getEtfExposureByIsin("ie0002xzsho1")?.regions[0].region).toBe("US");
    expect(getEtfExposureByIsin("XX")).toBeNull();
  });
});

describe("analyzeFees", () => {
  it("calcule le coût annuel TER × valeur et un taux pondéré", () => {
    const world = makePosition({ valueCents: 100_000_00, ter: 0.002 });
    const sP = makePosition({
      id: "pos-2",
      name: "S&P 500",
      isin: "FR0011552624",
      valueCents: 50_000_00,
      ter: 0.0025,
    });
    const result = analyzeFees([world, sP]);
    expect(result.annualCostCents).toBe(32_500);
    expect(result.feeRate).toBeCloseTo(0.0021666, 5);
    expect(result.lines[0].name).toBe("MSCI World Swap PEA");
  });

  it("ignore les enveloppes LIVRET_A", () => {
    const livret = makePosition({ category: "LIVRET_A", envelopeType: "LIVRET_A" });
    const result = analyzeFees([livret]);
    expect(result.lines).toHaveLength(0);
    expect(result.annualCostCents).toBe(0);
  });

  it("estime les frais de transaction depuis les versements", () => {
    const position = makePosition({
      investments: [{ date: new Date("2025-09-25"), amountCents: 100_000 }],
    });
    const result = analyzeFees([position]);
    expect(result.transactionFeesCents).toBe(100);
  });

  it("projette un manque à gagner croissant avec l'horizon quand les frais dépassent la référence", () => {
    const result = analyzeFees([makePosition({ ter: 0.0038 })]);
    expect(result.projectedLossCents).toHaveLength(3);
    expect(result.projectedLossCents[0].horizonYears).toBe(10);
    expect(result.projectedLossCents[2].lossCents).toBeGreaterThan(
      result.projectedLossCents[0].lossCents,
    );
  });

  it("ne projette aucune perte si les frais sont sous la référence", () => {
    const result = analyzeFees([makePosition({ ter: 0.001 })]);
    expect(result.projectedLossCents.every((p) => p.lossCents === 0)).toBe(true);
  });
});

describe("analyzeIncome", () => {
  it("compte les revenus cash des 12 derniers mois glissants", () => {
    const nvidia = makePosition({
      id: "pos-nvda",
      name: "NVIDIA",
      isin: "US67066G1040",
      isStock: true,
      ter: null,
      valueCents: 20_000,
      cashIncomeCents: [
        { date: new Date("2025-12-24"), amountCents: 1 },
        { date: new Date("2026-03-20"), amountCents: 1 },
        { date: new Date("2024-06-01"), amountCents: 500 },
      ],
    });
    const result = analyzeIncome([nvidia], now);
    expect(result.cashTwelveMonthsCents).toBe(2);
  });

  it("exclut les ETF capitalisants du scanner de revenus", () => {
    const world = makePosition({ valueCents: 100_000, ter: 0.002 });
    const result = analyzeIncome([world], now);
    expect(result.lines).toHaveLength(0);
    expect(result.excludedLines).toHaveLength(1);
    expect(result.excludedLines[0].reason).toBe("capitalizing");
    expect(result.projectedTwelveMonthsCents).toBe(0);
  });
  it("exclut une action ne versant aucun dividende", () => {
    const spacex = makePosition({
      name: "SpaceX",
      isStock: true,
      isin: "US84615Q1031",
      ter: null,
      valueCents: 20_000,
    });
    const result = analyzeIncome([spacex], now);
    expect(result.lines).toHaveLength(0);
    expect(result.excludedLines[0].reason).toBe("no_dividend");
  });
  it("liste une action payante avec sa fréquence et son prochain versement estimés", () => {
    const nvidia = makePosition({
      name: "NVIDIA",
      isStock: true,
      isin: "US67066G1040",
      ter: null,
      valueCents: 100_000,
    });
    const result = analyzeIncome([nvidia], now);
    expect(result.lines).toHaveLength(1);
    const line = result.lines[0];
    const nvda = getActionDetailBySymbol("US67066G1040")!;
    expect(line.projectedCents).toBe(Math.round(100_000 * nvda.dividendYield!));
    expect(line.paymentsPerYear).toBe(4);
    expect(line.paymentMonths).toEqual([2, 5, 8, 11]);
    expect(line.nextPayment).toEqual({
      year: 2026,
      month: 8,
      amountCents: Math.round(line.projectedCents / 4),
    });
    expect(result.monthlyCalendar.length).toBe(4);
  });

  it("remplit le calendrier prévisionnel depuis l'historique réel des versements", () => {
    const payer = makePosition({
      name: "Action payante",
      isStock: true,
      isin: "US67066G1040",
      ter: null,
      valueCents: 20_000,
      cashIncomeCents: [
        { date: new Date("2026-03-20"), amountCents: 10 },
        { date: new Date("2026-03-25"), amountCents: 5 },
      ],
    });
    const result = analyzeIncome([payer], now);
    const line = result.lines[0];
    expect(result.monthlyCalendar).toEqual([
      { year: 2027, month: 2, amountCents: line.projectedCents },
    ]);
    expect(line.paymentMonths).toEqual([2]);
    expect(line.paymentsPerYear).toBe(1);
  });
});

describe("analyzeSectors / analyzeRegions", () => {
  const world = makePosition({ valueCents: 100_000_00 });
  const france = makePosition({
    id: "pos-fr",
    name: "MSCI France",
    isin: "IE00BP3QZJ36",
    valueCents: 50_000_00,
  });

  it("déplie les ETF en exposition sectorielle pondérée", () => {
    const result = analyzeSectors([world, france]);
    expect(result.totalCents).toBe(150_000_00);
    const tech = result.lines.find((l) => l.sector === "Technologie");
    expect(tech).toBeDefined();
    const worldTech = 100_000_00 * 0.26;
    const franceTech = 50_000_00 * 0.07;
    expect(tech!.amountCents).toBe(Math.round(worldTech + franceTech));
  });

  it("calcule un score entre 0 et 10 et alerte sur les concentrations", () => {
    const result = analyzeSectors([world, france]);
    expect(result.score).not.toBeNull();
    expect(result.score!).toBeGreaterThanOrEqual(0);
    expect(result.score!).toBeLessThanOrEqual(10);
    // Technologie ≈ 19,4 % < 30 % : pas d'alerte
    expect(result.alerts.find((a) => a.label === "Technologie")).toBeUndefined();
  });

  it("agrège les pays du fichier ETF en zones continentales", () => {
    const result = analyzeRegions([world, france], "zone");
    const ameriqueNord = result.lines.find((l) => l.sector === "AmeriqueNord");
    expect(ameriqueNord).toBeDefined();
    // MSCI World ~69 % US + MSCI France ~89 % France (Europe)
    expect(ameriqueNord!.share).toBeGreaterThan(0.4);
    expect(ameriqueNord!.share).toBeLessThan(0.6);
    const europe = result.lines.find((l) => l.sector === "Europe");
    expect(europe).toBeDefined();
    expect(europe!.share).toBeGreaterThan(0.25);
  });
  it("liste les pays détaillés et regroupe les petits en « autres pays »", () => {
    const result = analyzeRegions([world, france], "country");
    const us = result.lines.find((l) => l.sector === "United States");
    expect(us).toBeDefined();
    expect(us!.share).toBeGreaterThan(0.4);
    for (const line of result.lines) {
      if (line.sector === "Autres pays") continue;
      expect(line.share).toBeGreaterThanOrEqual(0.01);
    }
    const others = result.lines.find((l) => l.sector === "Autres pays");
    if (others) {
      // la ligne agrégée peut dépasser 1 % (somme de plusieurs petits pays),
      // mais reste minoritaire devant le plus gros pays détaillé
      expect(others.share).toBeLessThan(us!.share);
    }
  });

  it("retourne un résultat vide sans position analysable", () => {
    const result = analyzeSectors([]);
    expect(result.lines).toHaveLength(0);
    expect(result.score).toBeNull();
  });
});

describe("simulateWealth", () => {
  it("projettera le capital avec épargne mensuelle et rendement composé", () => {
    const result = simulateWealth({
      currentWealthCents: 100_000_00,
      monthlySavingsCents: 1_000_00,
      annualReturn: 0.05,
      inflation: 0.02,
      horizonYears: 20,
      withdrawalRate: 0.04,
      monthlyExpensesCents: 1_500_00,
    });
    expect(result.points).toHaveLength(21);
    expect(result.points[0].nominalCents).toBe(100_000_00);
    expect(result.finalNominalCents).toBeGreaterThan(result.points[0].nominalCents);
    expect(result.finalRealCents).toBeLessThan(result.finalNominalCents);
    // 1 000 €/mois pendant 20 ans : au moins les versements seuls
    expect(result.finalNominalCents).toBeGreaterThan(100_000_00 + 240_000_00);
  });

  it("détecte l'année d'indépendance financière (règle 4 %)", () => {
    const result = simulateWealth({
      currentWealthCents: 90_000_00,
      monthlySavingsCents: 2_000_00,
      annualReturn: 0.05,
      inflation: 0.02,
      horizonYears: 30,
      withdrawalRate: 0.04,
      monthlyExpensesCents: 300_00,
    });
    // cible = 300 € × 12 / 0,04 = 90 000 € déjà atteinte dès la première année
    expect(result.fireYear).toBe(2026);
  });

  it("remplit les jalons de capital avec l'année d'atteinte", () => {
    const result = simulateWealth({
      currentWealthCents: 0,
      monthlySavingsCents: 3_000_00,
      annualReturn: 0.05,
      inflation: 0.02,
      horizonYears: 20,
      withdrawalRate: 0.04,
      monthlyExpensesCents: 1_000_00,
    });
    const first = result.milestones.find((m) => m.label === "100 k€");
    expect(first!.year).not.toBeNull();
    expect(first!.year!).toBeGreaterThan(2026);
  });

  it("produit une table de sensibilité 3 × 3", () => {
    const result = simulateWealth({
      currentWealthCents: 0,
      monthlySavingsCents: 1_000_00,
      annualReturn: 0.05,
      inflation: 0.02,
      horizonYears: 10,
      withdrawalRate: 0.04,
      monthlyExpensesCents: 1_000_00,
    });
    expect(result.sensitivity).toHaveLength(9);
  });
});

describe("averageMonthlySavings / estimateMonthlyExpenses", () => {
  it("moyenne l'épargne sur les 12 derniers mois", () => {
    const position = makePosition({
      investments: [
        { date: new Date("2026-09-02"), amountCents: 300_00 },
        { date: new Date("2026-08-02"), amountCents: 300_00 },
        { date: new Date("2025-08-01"), amountCents: 999_99 },
      ],
    });
    const result = averageMonthlySavings([position], now);
    expect(result).toBe(Math.round(600_00 / 12));
  });

  it("retourne null sans historique de versements", () => {
    expect(averageMonthlySavings([makePosition({ investments: [] })], now)).toBeNull();
  });

  it("estime les dépenses = salaire − épargne moyenne", () => {
    expect(estimateMonthlyExpenses(300_000, 100_000)).toBe(200_000);
    expect(estimateMonthlyExpenses(300_000, null)).toBe(240_000);
    expect(estimateMonthlyExpenses(null, 100_000)).toBeNull();
  });
});
