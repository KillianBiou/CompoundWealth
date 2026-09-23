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

import { investedSeries } from "./series";

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

import { aggregateSeries } from "./series";

describe("aggregateSeries", () => {
  it("agrège plusieurs enveloppes en sommant les dernières valeurs connues", () => {
    const a = [
      { date: d("2026-01-01"), valueCents: 10_000 },
      { date: d("2026-03-01"), valueCents: 12_000 },
    ];
    const b = [
      { date: d("2026-02-01"), valueCents: 5_000 },
      { date: d("2026-03-01"), valueCents: 6_000 },
    ];
    const points = aggregateSeries([a, b]);
    expect(points.map((p) => p.date.toISOString().slice(0, 10))).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
    ]);
    expect(points.map((p) => p.valueCents)).toEqual([10_000, 15_000, 18_000]);
  });

  it("interpole à plat une enveloppe sans point à une date donnée", () => {
    const a = [
      { date: d("2026-01-01"), valueCents: 10_000 },
      { date: d("2026-04-01"), valueCents: 20_000 },
    ];
    const b = [{ date: d("2026-02-01"), valueCents: 5_000 }];
    const points = aggregateSeries([a, b]);
    expect(points.map((p) => p.valueCents)).toEqual([10_000, 15_000, 25_000]);
  });

  it("ignore les séries vides", () => {
    const a = [{ date: d("2026-01-01"), valueCents: 10_000 }];
    expect(aggregateSeries([a, []])).toEqual(a);
    expect(aggregateSeries([[], []])).toEqual([]);
  });
});

import { buildEnvelopeInvestedSeries } from "./series";

describe("buildEnvelopeInvestedSeries", () => {
  it("utilise l'historique détaillé des versements quand il existe", () => {
    const points = buildEnvelopeInvestedSeries([
      {
        investedCents: 10_000,
        boughtAt: d("2026-01-01"),
        investments: [
          { date: d("2026-02-01"), amountCents: 6_000 },
          { date: d("2026-03-01"), amountCents: 4_000 },
        ],
      },
    ]);
    expect(points).toEqual([
      { date: d("2026-02-01"), valueCents: 6_000 },
      { date: d("2026-03-01"), valueCents: 10_000 },
    ]);
  });

  it("retombe sur le montant investi à la date d'achat sans historique", () => {
    const points = buildEnvelopeInvestedSeries([
      {
        investedCents: 10_000,
        boughtAt: d("2026-01-15"),
        investments: [],
      },
    ]);
    expect(points).toEqual([{ date: d("2026-01-15"), valueCents: 10_000 }]);
  });

  it("ignore les positions en état des lieux sans historique", () => {
    expect(
      buildEnvelopeInvestedSeries([
        { investedCents: null, boughtAt: d("2026-01-15"), investments: [] },
      ]),
    ).toEqual([]);
  });

  it("cumule les versements de plusieurs positions", () => {
    const points = buildEnvelopeInvestedSeries([
      {
        investedCents: 5_000,
        boughtAt: d("2026-01-01"),
        investments: [{ date: d("2026-02-01"), amountCents: 5_000 }],
      },
      {
        investedCents: 3_000,
        boughtAt: d("2026-02-01"),
        investments: [{ date: d("2026-02-01"), amountCents: 3_000 }],
      },
    ]);
    expect(points).toEqual([{ date: d("2026-02-01"), valueCents: 8_000 }]);
  });
});
