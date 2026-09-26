import { describe, expect, it } from "vitest";
import { buildPerformanceReport, buildLevel } from "./performance-report";
import type { CashFlow } from "./performance";
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
  it("calcule XIRR et Modified Dietz d'un niveau sur ses seuls flux", () => {
    const level = buildLevel({
      id: "pos-1",
      name: "MSCI World",
      flows: [{ date: new Date("2024-01-15"), amountCents: 100_000 }],
      finalValueCents: 110_000,
      finalDate: NOW,
    });
    // 366 jours : XIRR convention Excel ≈ 9,97 %
    expect(level.metrics?.xirr).toBeCloseTo(0.0997, 3);
    // flux unique : le TWR approché (Modified Dietz) = rendement simple
    expect(level.metrics?.twrCumulative).toBeCloseTo(0.1, 4);
    expect(level.contributedCents).toBe(100_000);
    expect(level.valueCents).toBe(110_000);
  });

  it("normalise les flux à minuit UTC (dépôt livret 22:00Z ≡ 00:00Z)", () => {
    const level = buildLevel({
      id: "pos-2",
      name: "NVIDIA",
      flows: [{ date: new Date("2024-01-15T22:00:00.000Z"), amountCents: 100_000 }],
      finalValueCents: 120_000,
      finalDate: NOW,
    });
    expect(level.flows[0].date.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    expect(level.metrics?.xirr).toBeCloseTo(0.1994, 3);
  });

  it("TWR d'une position quasi flat ≈ son rendement simple, quel que soit le nombre de versements", () => {
    const flows = Array.from({ length: 12 }, (_, i) => ({
      date: new Date(2024, i, 1),
      amountCents: 10_000,
    }));
    const level = buildLevel({
      id: "pos-3",
      name: "IFRE",
      flows,
      finalValueCents: 120_300, // +0,25 % de gain réel
      finalDate: NOW,
    });
    const simple = level.metrics?.simpleReturn ?? 0;
    const twr = level.metrics?.twrCumulative ?? 1;
    expect(simple).toBeCloseTo(0.0025, 3);
    // cohérence : jamais plusieurs dizaines de fois le rendement simple
    expect(Math.abs(twr - simple)).toBeLessThan(0.01);
  });
});

describe("buildPerformanceReport", () => {
  it("assemble total, enveloppes, positions et références avec gains et écarts", () => {
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

    // références « mêmes versements » : valeur, vrai gain, écart vs portefeuille
    const savings = report.savingsReference!;
    const world = report.worldReference!;
    expect(savings).not.toBeNull();
    expect(world).not.toBeNull();
    expect(world.valueCents).toBeGreaterThan(savings.valueCents);
    // le vrai gain de la référence Monde (8 %/an) dépasse celui du livret
    expect(world.gainCents).toBeGreaterThan(savings.gainCents);
    // l'écart est la valeur du portefeuille moins la valeur de référence
    expect(savings.deltaCents).toBe(report.total.valueCents - savings.valueCents);
    expect(world.deltaCents).toBe(report.total.valueCents - world.valueCents);
  });

  it("le gain de la référence Monde est toujours supérieur au gain Livret (anti-inversion)", () => {
    const report = buildPerformanceReport({
      positions: [makePosition()],
      livretFlows: [],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      now: NOW,
    });
    const savings = report.savingsReference!;
    const world = report.worldReference!;
    expect(savings.gainCents).toBeGreaterThan(0);
    expect(world.gainCents).toBeGreaterThan(savings.gainCents);
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
    expect(report.savingsReference).toBeNull();
    expect(report.worldReference).toBeNull();
    expect(report.worldGrowth).toBeNull();
    expect(report.total.metrics?.xirr).toBeNull();
  });

  it("critères d'acceptation : TWR plausible sur un gain réel de 2,9 %, position flat ≈ simple", () => {
    // PEA : gain réel +2,9 % sur 12 versements mensuels ; IFRE quasi flat
    const peaFlows = Array.from({ length: 12 }, (_, i) => ({
      date: new Date(Date.UTC(2025, i, 1)),
      amountCents: 75_000,
    }));
    const ifreFlows = Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.UTC(2025, i + 1, 1)),
      amountCents: 10_000,
    }));
    const positions = [
      makePosition({
        id: "pea-pos",
        name: "PEA ETF",
        envelopeId: "env-pea",
        envelopeName: "PEA",
        envelopeType: "PEA",
        investments: peaFlows,
        investedCents: 900_000,
        valueCents: 900_000 + 26_100,
        boughtAt: new Date(Date.UTC(2025, 0, 1)),
        valuations: [],
      }),
      makePosition({
        id: "ifre-pos",
        name: "IFRE",
        envelopeId: "env-cto",
        envelopeName: "CTO",
        envelopeType: "CTO",
        investments: ifreFlows,
        investedCents: 100_000,
        valueCents: 100_020,
        boughtAt: new Date(Date.UTC(2025, 1, 1)),
        valuations: [],
      }),
    ];
    const report = buildPerformanceReport({
      positions,
      livretFlows: [{ date: new Date(Date.UTC(2025, 5, 1)), amountCents: 5_000 }],
      livretValueCents: 5_040,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      now: new Date("2026-06-30T00:00:00Z"),
    });
    const total = report.total.metrics!;
    const ifre = report.positions.find((p) => p.name === "IFRE")!.metrics!;
    // le TWR cumulé du total reste plausible (quelques %), pas 87 %
    expect(total.twrCumulative!).toBeGreaterThan(0);
    expect(total.twrCumulative!).toBeLessThan(0.08);
    // position quasi flat : TWR ≈ rendement simple, jamais +57 %
    expect(Math.abs(ifre.twrCumulative! - ifre.simpleReturn!)).toBeLessThan(0.005);
    expect(ifre.twrCumulative!).toBeLessThan(0.01);
    // gain de la référence Monde toujours > gain Livret (anti-inversion)
    expect(report.worldReference!.gainCents).toBeGreaterThan(
      report.savingsReference!.gainCents,
    );
  });

  it("sous-période : le cutoff segmente flux et capital initial partout", () => {
    // position achetée 100 000 € mi-2024, valorisée 102 000 € au cutoff
    // 2025-01-15, +10 000 € versés après, valeur finale 118 000 €
    const position = makePosition({
      id: "pos-sub",
      name: "WPEA",
      investments: [
        { date: new Date("2024-06-15"), amountCents: 100_000 },
        { date: new Date("2025-06-15"), amountCents: 10_000 },
      ],
      investedCents: 110_000,
      valueCents: 118_000,
      boughtAt: new Date("2024-06-15"),
      valuations: [
        { date: new Date("2024-06-15"), valueCents: 100_000 },
        { date: new Date("2025-01-15"), valueCents: 102_000 },
        { date: new Date("2026-06-15"), valueCents: 118_000 },
      ],
    });
    const periodStart = new Date("2025-01-15");
    const report = buildPerformanceReport({
      positions: [position],
      livretFlows: [],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      period: "1y",
      periodStart,
      now: new Date("2026-01-15T00:00:00Z"),
    });
    expect(report.period).toBe("1y");
    expect(report.periodStart?.toISOString()).toBe("2025-01-15T00:00:00.000Z");
    // position : capital initial 102 000 € (dernière valorisation ≤ cutoff),
    // un seul versement dans la période (10 000 €)
    const level = report.positions[0];
    expect(level.startValueCents).toBe(102_000);
    expect(level.contributedCents).toBe(10_000);
    expect(level.metrics?.gainCents).toBe(6_000);
    expect(level.flows).toHaveLength(1);
    // enveloppe : même segmentation, valeur initiale agrégée
    const envelope = report.envelopes[0];
    expect(envelope.startValueCents).toBe(102_000);
    expect(envelope.contributedCents).toBe(10_000);
    // total : capital initial = valorisation au cutoff
    expect(report.total.startValueCents).toBe(102_000);
    expect(report.total.contributedCents).toBe(10_000);
    // références : le capital initial est placé au taux, le gain reste
    // la valeur théorique moins (capital initial + versements de la période)
    const world = report.worldReference!;
    expect(world.gainCents).toBe(
      world.valueCents - 102_000 - 10_000,
    );
  });
  it("la période se clôt à la dernière valorisation, pas à « maintenant » (off-by-one de years)", () => {
    // versement 2025-09-25, dernière valorisation 2026-09-24, analyse lancée
    // le 2026-09-26 : years doit être 364/365, pas 366/365
    const position = makePosition({
      id: "pos-obs",
      name: "WPEA",
      investments: [{ date: new Date("2025-09-25"), amountCents: 100_000 }],
      investedCents: 100_000,
      valueCents: 110_000,
      boughtAt: new Date("2025-09-25"),
      valuations: [
        { date: new Date("2025-09-25"), valueCents: 100_000 },
        { date: new Date("2026-09-24"), valueCents: 110_000 },
      ],
    });
    const report = buildPerformanceReport({
      positions: [position],
      livretFlows: [],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      now: new Date("2026-09-26T12:00:00Z"),
    });
    expect(report.total.metrics?.years).toBeCloseTo(364 / 365, 6);
    expect(report.positions[0].metrics?.years).toBeCloseTo(364 / 365, 6);
    // le livret sans quinzaine d'observation connue n'influence pas la date
  });
  it("un actif né en cours de fenêtre garde le même TWR en « 1y » qu'en « all »", () => {
    // EM-like : né en juin 2026, cutoff 1 an en septembre 2025 → la fenêtre
    // 1y ne l'a jamais contenu : son Dietz doit être identique aux deux vues
    const position = makePosition({
      id: "pos-em",
      name: "MSCI EM",
      envelopeId: "env-cto",
      envelopeName: "CTO",
      envelopeType: "CTO",
      investments: [
        { date: new Date("2026-06-02"), amountCents: 700_000 },
        { date: new Date("2026-07-02"), amountCents: 1_200_000 },
        { date: new Date("2026-08-03"), amountCents: 1_200_000 },
        { date: new Date("2026-09-02"), amountCents: 1_200_000 },
      ],
      investedCents: 4_300_000,
      valueCents: 4_455_900,
      boughtAt: new Date("2026-06-02"),
      valuations: [
        { date: new Date("2026-06-02"), valueCents: 700_000 },
        { date: new Date("2026-09-24"), valueCents: 4_455_900 },
      ],
    });
    const base = {
      positions: [position],
      livretFlows: [] as CashFlow[],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      now: new Date("2026-09-26T12:00:00Z"),
    };
    const all = buildPerformanceReport(base);
    const oneYear = buildPerformanceReport({
      ...base,
      period: "1y",
      periodStart: new Date("2025-09-26"),
    });
    expect(oneYear.positions[0].metrics?.twrCumulative).toBeCloseTo(
      all.positions[0].metrics?.twrCumulative ?? NaN,
      6,
    );
    // ≈ 6,6 % (détention réelle), pas 20,5 % (fenêtre d'affichage)
    expect(oneYear.positions[0].metrics?.twrCumulative).toBeCloseTo(0.066, 2);
    // le total, lui, vit sur la fenêtre complète : cutoff → fin
    expect(oneYear.total.metrics?.twrCumulative).not.toBeNull();
  });
  it("transmet la croissance réelle du Monde sur la même période", () => {
    const report = buildPerformanceReport({
      positions: [makePosition()],
      livretFlows: [],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      worldGrowth: {
        cumulative: 0.12,
        annualized: 0.12,
        startDate: new Date("2024-01-15"),
        endDate: new Date("2025-01-15"),
        referenceValueCents: 112_000,
        deltaCents: -2_000,
      },
      now: NOW,
    });
    expect(report.worldGrowth?.cumulative).toBeCloseTo(0.12, 6);
  });

  it("worldGrowth.deltaCents est toujours valeur du portefeuille − valeur de la référence", () => {
    // l'écart affiché « vs ETF Monde réel » est un invariant : il ne doit
    // jamais être recalculé ailleurs (c'est ce qui a produit 753,84 € à
    // côté d'un export JSON à 690,30 €)
    const report = buildPerformanceReport({
      positions: [makePosition()],
      livretFlows: [],
      livretValueCents: 0,
      savingsRate: 0.017,
      worldEquityRate: 0.08,
      worldGrowth: {
        cumulative: 0.12,
        annualized: null,
        startDate: new Date("2024-01-15"),
        endDate: new Date("2025-01-15"),
        referenceValueCents: 112_000,
        // volontairement faux : le report doit l'écraser
        deltaCents: 123_456,
      },
      now: NOW,
    });
    expect(report.worldGrowth?.deltaCents).toBe(
      report.total.valueCents - 112_000,
    );
    expect(report.observationDate).toEqual(new Date("2025-01-15T00:00:00.000Z"));
  });
});
