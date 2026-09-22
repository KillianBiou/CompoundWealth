import { describe, expect, it } from "vitest";
import {
  buildEnvelopeSeries,
  buildEnvelopeValuations,
  currentValueCents,
  investedBefore,
  valueAt,
} from "./series";

const d = (s: string) => new Date(s);

describe("currentValueCents", () => {
  it("retourne la dernière valorisation triée", () => {
    const valuations = [
      { date: d("2026-03-01"), valueCents: 100_000 },
      { date: d("2026-01-01"), valueCents: 50_000 },
      { date: d("2026-06-01"), valueCents: 120_000 },
    ];
    expect(currentValueCents(valuations, 0)).toBe(120_000);
  });
  it("retourne le total investi si aucune valorisation", () => {
    expect(currentValueCents([], 75_000)).toBe(75_000);
  });
});

describe("buildEnvelopeSeries", () => {
  const valuations = [
    { date: d("2025-06-01"), valueCents: 100_000 },
    { date: d("2026-01-01"), valueCents: 110_000 },
    { date: d("2026-09-01"), valueCents: 130_000 },
  ];

  it("retourne tous les points sur 'all'", () => {
    const series = buildEnvelopeSeries(valuations, 0, null, d("2026-09-22"), "all");
    expect(series).toHaveLength(3);
    expect(series.every((p) => p.known)).toBe(true);
  });
  it("échantillonne depuis la période demandée avec point d'ancrage interpolé", () => {
    const series = buildEnvelopeSeries(valuations, 0, null, d("2026-09-22"), "6m");
    const start = d("2026-03-24");
    expect(series[0].date.toDateString()).toBe(start.toDateString());
    expect(series[0].known).toBe(false);
    expect(series[0].valueCents).toBe(110_000);
    expect(series).toHaveLength(2);
    expect(series[1].valueCents).toBe(130_000);
  });

  it("couvre les nouvelles périodes courtes (1 semaine, 1 mois, 2 ans)", () => {
    const now = d("2026-09-22");
    const shortSeries = buildEnvelopeSeries(valuations, 0, null, now, "1w");
    expect(shortSeries).toHaveLength(1);
    expect(shortSeries[0].valueCents).toBe(130_000);

    const monthSeries = buildEnvelopeSeries(valuations, 0, null, now, "1m");
    expect(monthSeries).toHaveLength(2);
    expect(monthSeries[0].known).toBe(false);
    expect(monthSeries[0].valueCents).toBe(110_000);
    expect(monthSeries[1].known).toBe(true);
    expect(monthSeries[1].valueCents).toBe(130_000);

    const twoYears = buildEnvelopeSeries(valuations, 0, null, now, "2y");
    expect(twoYears).toHaveLength(3);
    expect(twoYears.every((p) => p.known)).toBe(true);
  });
  it("série vide sans valorisation", () => {
    expect(buildEnvelopeSeries([], 0, null)).toHaveLength(0);
  });
});

describe("valueAt", () => {
  it("interpole à plat entre deux points connus", () => {
    const sorted = [
      { date: d("2026-01-01"), valueCents: 100 },
      { date: d("2026-03-01"), valueCents: 200 },
    ];
    expect(valueAt(sorted, d("2026-02-01"))).toBe(100);
    expect(valueAt(sorted, d("2026-04-01"))).toBe(200);
  });
});

describe("investedBefore", () => {
  it("additionne les positions achetées avant la date", () => {
    const positions = [
      { investedCents: 10_000, boughtAt: d("2026-01-01") },
      { investedCents: 5_000, boughtAt: d("2026-06-01") },
    ];
    expect(investedBefore(positions, d("2026-03-01"))).toBe(10_000);
    expect(investedBefore(positions, d("2026-12-31"))).toBe(15_000);
  });
});

describe("buildEnvelopeValuations", () => {
  const d = (s: string) => new Date(s);
  it("agrège les valorisations de positions par date", () => {
    const points = buildEnvelopeValuations([
      {
        valuations: [
          { date: d("2026-01-01"), valueCents: 10_000 },
          { date: d("2026-03-01"), valueCents: 11_000 },
        ],
      },
      {
        valuations: [
          { date: d("2026-02-01"), valueCents: 5_000 },
          { date: d("2026-03-01"), valueCents: 6_000 },
        ],
      },
    ]);
    expect(points.map((p) => p.date.toISOString().slice(0, 10))).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(points.map((p) => p.valueCents)).toEqual([10_000, 15_000, 17_000]);
  });
  it("retourne une liste vide sans positions valorisées", () => {
    expect(buildEnvelopeValuations([])).toEqual([]);
    expect(buildEnvelopeValuations([{ valuations: [] }])).toEqual([]);
  });
});

import { annualizedGrowthRate, buildCompoundInterestSeries, investedSeries } from "./series";

describe("investedSeries", () => {
  it("cumule les versements par date", () => {
    const points = investedSeries([
      { date: d("2026-02-01"), amountCents: 10_000 },
      { date: d("2026-01-01"), amountCents: 5_000 },
      { date: d("2026-02-01"), amountCents: 3_000 },
    ]);
    expect(points).toEqual([
      { date: d("2026-01-01"), valueCents: 5_000 },
      { date: d("2026-02-01"), valueCents: 18_000 },
    ]);
  });
});

describe("annualizedGrowthRate", () => {
  it("trouve le taux composé qui reproduit la valeur finale", () => {
    const investments = [{ date: d("2025-01-01"), amountCents: 100_000 }];
    const finalDate = d("2026-01-01");
    const rate = annualizedGrowthRate(investments, 110_000, finalDate);
    expect(rate).not.toBeNull();
    expect(rate!).toBeCloseTo(0.10, 3);
  });

  it("retourne null sans versement ni valeur", () => {
    expect(annualizedGrowthRate([], 100, d("2026-01-01"))).toBeNull();
    expect(annualizedGrowthRate([{ date: d("2026-01-01"), amountCents: 100 }], 0, d("2026-01-01"))).toBeNull();
  });
});

describe("buildCompoundInterestSeries", () => {
  it("décompose en croissance simple et composée, intérêts nuls au départ", () => {
    const valuations = [
      { date: d("2025-01-01"), valueCents: 100_000 },
      { date: d("2027-01-01"), valueCents: 121_000 },
    ];
    const investments = [{ date: d("2025-01-01"), amountCents: 100_000 }];
    const series = buildCompoundInterestSeries(valuations, investments);
    expect(series).toHaveLength(2);
    expect(series[0].compoundInterestCents).toBe(0);
    const last = series[series.length - 1];
    expect(Math.abs(last.compoundGrowthCents - 121_000)).toBeLessThanOrEqual(2);
    expect(Math.abs(last.simpleGrowthCents - 120_000)).toBeLessThanOrEqual(2);
    expect(last.compoundInterestCents).toBeGreaterThan(900);
    expect(last.compoundInterestCents).toBeLessThan(1_100);
  });

  it("retourne une série vide sans versements ou avec un taux négatif", () => {
    expect(buildCompoundInterestSeries([], [])).toHaveLength(0);
    const valuations = [
      { date: d("2025-01-01"), valueCents: 100_000 },
      { date: d("2026-01-01"), valueCents: 80_000 },
    ];
    expect(
      buildCompoundInterestSeries(valuations, [{ date: d("2025-01-01"), amountCents: 100_000 }]),
    ).toHaveLength(0);
  });
});
