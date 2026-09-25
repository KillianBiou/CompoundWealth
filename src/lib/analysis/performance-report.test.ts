import { describe, expect, it } from "vitest";
import { buildPerformanceReport, buildLevel } from "./performance-report";
import type { AnalysisPosition } from "./scanners";

const NOW = new Date("2025-01-15T12:00:00Z");

function makePosition(overrides: Partial<AnalysisPosition> = {}): AnalysisPosition {
  return {
    id: "pos-1",
    name: "MSCI World",
    isin: null,
    symbol: null,
    envelopeId: "env-1",
    envelopeName: "PEA",
    envelopeType: "PEA",
    category: "ETF",
    valueCents: 110_000,
    investedCents: 100_000,
    ter: 0.002,
    boughtAt: new Date("2024-01-15"),
    investments: [{ date: new Date("2024-01-15"), amountCents: 100_000 }],
    cashIncomeCents: [],
    isStock: false,
    valuations: [
      { date: new Date("2024-01-15"), valueCents: 100_000 },
      { date: new Date("2024-07-15"), valueCents: 105_000 },
      { date: new Date("2025-01-15"), valueCents: 110_000 },
    ],
    ...overrides,
  };
}

describe("buildLevel", () => {
  it("calcule XIRR et TWR d'un niveau avec valorisations complètes", () => {
    const level = buildLevel({
      id: "pos-1",
      name: "MSCI World",
      valuations: [
        { date: new Date("2024-01-15"), valueCents: 100_000 },
        { date: new Date("2025-01-15"), valueCents: 110_000 },
      ],
      flows: [{ date: new Date("2024-01-15"), amountCents: 100_000 }],
      finalValueCents: 110_000,
      finalDate: NOW,
    });
    expect(level.metrics?.xirr).toBeCloseTo(0.1, 1);
    expect(level.metrics?.twrCumulative).toBeCloseTo(0.1, 2);
    expect(level.contributedCents).toBe(100_000);
    expect(level.valueCents).toBe(110_000);
  });

  it("approxime les valorisations quand absentes (XIRR reste exact)", () => {
    const level = buildLevel({
      id: "pos-2",
      name: "NVIDIA",
      valuations: [],
      flows: [{ date: new Date("2024-01-15"), amountCents: 100_000 }],
      finalValueCents: 120_000,
      finalDate: NOW,
      approximateValuations: true,
    });
    expect(level.metrics?.xirr).toBeCloseTo(0.2, 1);
  });
});

describe("buildPerformanceReport", () => {
  it("assemble total, enveloppes, positions et références", () => {
    const positions = [
      makePosition(),
      makePosition({
        id: "pos-2",
        name: "NVIDIA",
        envelopeId: "env-2",
        envelopeName: "CTO",
        envelopeType: "CTO",
        valueCents: 55_000,
        investedCents: 50_000,
        investments: [{ date: new Date("2024-01-15"), amountCents: 50_000 }],
        valuations: [
          { date: new Date("2024-01-15"), valueCents: 50_000 },
          { date: new Date("2025-01-15"), valueCents: 55_000 },
        ],
      }),
    ];
    const report = buildPerformanceReport({
      positions,
      livretFlows: [{ date: new Date("2024-01-15"), amountCents: 30_000 }],
      livretValueCents: 30_500,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      now: NOW,
    });
    expect(report.total.valueCents).toBe(110_000 + 55_000 + 30_500);
    expect(report.total.contributedCents).toBe(180_000);
    // 2 enveloppes d'investissement (le livret n'a pas de position)
    expect(report.envelopes).toHaveLength(2);
    expect(report.positions).toHaveLength(2);
    // références : mêmes versements au taux livret vs taux actions
    expect(report.savingsReferenceValueCents).not.toBeNull();
    expect(report.worldReferenceValueCents).not.toBeNull();
    expect(report.worldReferenceValueCents!).toBeGreaterThan(
      report.savingsReferenceValueCents!,
    );
  });

  it("sans aucun flux, les références sont null", () => {
    const report = buildPerformanceReport({
      positions: [],
      livretFlows: [],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      now: NOW,
    });
    expect(report.savingsReferenceValueCents).toBeNull();
    expect(report.worldReferenceValueCents).toBeNull();
    expect(report.total.metrics?.xirr).toBeNull();
  });
});
