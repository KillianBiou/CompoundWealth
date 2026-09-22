import { describe, expect, it } from "vitest";
import {
  buildEnvelopeSeries,
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
    const start = d("2026-03-22");
    expect(series[0].date.toDateString()).toBe(start.toDateString());
    expect(series[0].known).toBe(false);
    expect(series[0].valueCents).toBe(110_000);
    expect(series).toHaveLength(2);
    expect(series[1].valueCents).toBe(130_000);
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
