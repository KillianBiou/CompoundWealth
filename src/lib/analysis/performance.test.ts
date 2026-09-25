import { describe, expect, it } from "vitest";
import {
  computePerformanceMetrics,
  mergeCashFlows,
  positionCashFlows,
  referenceFinalValue,
  timeWeightedReturn,
  xirr,
  type CashFlow,
} from "./performance";

const YEAR = 365 * 24 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;

function yearsAgo(years: number, from: Date): Date {
  return new Date(from.getTime() - years * YEAR);
}

describe("positionCashFlows", () => {
  it("utilise l'historique détaillé des versements quand il existe", () => {
    const flows = positionCashFlows({
      investments: [
        { date: new Date("2024-01-15"), amountCents: 100_000 },
        { date: new Date("2024-02-15"), amountCents: 50_000 },
      ],
      investedCents: 150_000,
      boughtAt: new Date("2024-01-15"),
    });
    expect(flows).toEqual([
      { date: new Date("2024-01-15"), amountCents: 100_000 },
      { date: new Date("2024-02-15"), amountCents: 50_000 },
    ]);
  });

  it("retombe sur l'investi total daté du premier achat", () => {
    const flows = positionCashFlows({
      investments: [],
      investedCents: 120_000,
      boughtAt: new Date("2024-03-01"),
    });
    expect(flows).toEqual([{ date: new Date("2024-03-01"), amountCents: 120_000 }]);
  });

  it("retourne vide sans investi", () => {
    expect(
      positionCashFlows({
        investments: [],
        investedCents: null,
        boughtAt: new Date("2024-03-01"),
      }),
    ).toEqual([]);
  });
});

describe("mergeCashFlows", () => {
  it("fusionne et cumule les flux du même jour", () => {
    const merged = mergeCashFlows([
      { date: new Date("2024-01-15"), amountCents: 100 },
      { date: new Date("2024-01-15"), amountCents: 50 },
      { date: new Date("2024-02-15"), amountCents: 200 },
    ]);
    expect(merged).toEqual([
      { date: new Date("2024-01-15"), amountCents: 150 },
      { date: new Date("2024-02-15"), amountCents: 200 },
    ]);
  });
});

describe("xirr", () => {
  it("exemple DCA de l'énoncé : €10 450 sur 14 mois → €11 231 ≈ +7,5 % simple, XIRR supérieur", () => {
    const end = new Date("2025-02-28");
    const flows: CashFlow[] = [];
    // 14 versements mensuels ≈ 10 450 € au total, dernier versement réduit
    const amounts = [
      750_00, 750_00, 750_00, 750_00, 750_00, 750_00, 750_00, 750_00,
      750_00, 750_00, 750_00, 750_00, 750_00, 700_00,
    ];
    amounts.forEach((amountCents, i) => {
      const d = new Date(end);
      d.setMonth(d.getMonth() - (13 - i));
      flows.push({ date: d, amountCents });
    });
    const total = amounts.reduce((s, a) => s + a, 0);
    expect(total).toBe(10_450_00);
    const rate = xirr(flows, 11_231_00, end);
    expect(rate).not.toBeNull();
    // le rendement simple sous-estime la performance réelle en marché
    // haussier : l'argent n'était pas investi toute la période
    const simple = (11_231_00 - total) / total;
    expect(rate!).toBeGreaterThan(simple);
    // racine vérifiée indépendamment (bisection Python sur les mêmes flux)
    expect(rate!).toBeCloseTo(0.1386, 2);
  });

  it("versement unique conservé 1 an avec +10 % → XIRR ≈ 10 %", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: yearsAgo(1, end), amountCents: 100_000 }];
    const rate = xirr(flows, 110_000, end);
    expect(rate).toBeCloseTo(0.1, 2);
  });

  it("DCA 12 mois, marché +10 % : le XIRR est bien plus élevé que le simple", () => {
    // 12 versements de 1 500 €, marché +10 % sur l'année → valeur finale
    // = somme des versements capitalisés à 10 % jusqu'à la fin
    const end = new Date("2025-01-01");
    const flows: CashFlow[] = [];
    for (let i = 0; i < 12; i += 1) {
      const d = new Date(end);
      d.setMonth(d.getMonth() - (11 - i));
      flows.push({ date: d, amountCents: 150_000 });
    }
    let finalValue = 0;
    for (const flow of flows) {
      const years = (end.getTime() - flow.date.getTime()) / YEAR;
      finalValue += flow.amountCents * Math.pow(1.1, years);
    }
    const rate = xirr(flows, Math.round(finalValue), end);
    expect(rate).toBeCloseTo(0.1, 2);
    const simple = (Math.round(finalValue) - 1_800_000) / 1_800_000;
    // le rendement simple (~5,6 %) sous-estime nettement le XIRR (10 %)
    expect(simple).toBeLessThan(rate!);
  });

  it("retourne null sans flux ou avec une valeur finale nulle", () => {
    const end = new Date("2025-01-01");
    expect(xirr([], 100_000, end)).toBeNull();
    expect(
      xirr([{ date: yearsAgo(1, end), amountCents: 100_000 }], 0, end),
    ).toBeNull();
  });

  it("gère un rendement négatif", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: yearsAgo(1, end), amountCents: 100_000 }];
    const rate = xirr(flows, 80_000, end);
    expect(rate).toBeCloseTo(-0.2, 2);
  });
});

describe("timeWeightedReturn", () => {
  it("sans flux externe, TWR = variation de la valeur", () => {
    const end = new Date("2025-01-01");
    const valuations = [
      { date: yearsAgo(1, end), valueCents: 100_000 },
      { date: end, valueCents: 110_000 },
    ];
    const twr = timeWeightedReturn(valuations, [], 110_000, end);
    expect(twr.cumulative).toBeCloseTo(0.1, 4);
    expect(twr.annualized).toBeCloseTo(0.1, 2);
  });

  it("neutralise un versement intermédiaire (DCA)", () => {
    const end = new Date("2025-01-01");
    const start = yearsAgo(1, end);
    const mid = new Date(start.getTime() + 0.5 * YEAR);
    // sous-période 1 : 100k → 105k ; versement de 50k ; sous-période 2 : 155k → 161,2k
    const valuations = [
      { date: start, valueCents: 100_000 },
      { date: mid, valueCents: 105_000 },
      { date: end, valueCents: 161_200 },
    ];
    const flows = [{ date: mid, amountCents: 50_000 }];
    const twr = timeWeightedReturn(valuations, flows, 161_200, end);
    // r1 = 5 %, r2 = (161,2 − 155) / 155 = 4 % → TWR ≈ 9,2 %
    expect(twr.cumulative).toBeCloseTo(0.092, 3);
  });
});

describe("computePerformanceMetrics", () => {
  it("retourne simple, gain, contributions et XIRR cohérents", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: yearsAgo(1, end), amountCents: 100_000 }];
    const result = computePerformanceMetrics({
      valuations: [
        { date: yearsAgo(1, end), valueCents: 100_000 },
        { date: end, valueCents: 108_000 },
      ],
      flows,
      finalValueCents: 108_000,
      finalDate: end,
    });
    expect(result.simpleReturn).toBeCloseTo(0.08, 4);
    expect(result.gainCents).toBe(8_000);
    expect(result.contributedCents).toBe(100_000);
    expect(result.xirr).toBeCloseTo(0.08, 2);
    expect(result.twrCumulative).toBeCloseTo(0.08, 4);
    expect(result.years).toBeCloseTo(1, 1);
  });

  it("données insuffisantes (< 30 jours) → métriques null", () => {
    const end = new Date("2025-01-30");
    const flows = [{ date: new Date("2025-01-01"), amountCents: 100_000 }];
    const result = computePerformanceMetrics({
      valuations: [{ date: new Date("2025-01-01"), valueCents: 100_000 }],
      flows,
      finalValueCents: 101_000,
      finalDate: end,
    });
    expect(result.xirr).toBeNull();
    expect(result.twrAnnualized).toBeNull();
    expect(result.simpleReturn).toBeCloseTo(0.01, 4);
  });
});

describe("referenceFinalValue", () => {
  it("capitalise chaque versement au taux de référence jusqu'à la fin", () => {
    const end = new Date("2025-01-01");
    const flows = [
      { date: yearsAgo(1, end), amountCents: 100_000 },
      { date: end, amountCents: 50_000 },
    ];
    const value = referenceFinalValue(flows, end, 0.08);
    expect(value).toBe(Math.round(100_000 * 1.08 + 50_000));
  });

  it("ignore les flux postérieurs à la date finale", () => {
    const end = new Date("2025-01-01");
    const flows = [
      { date: yearsAgo(1, end), amountCents: 100_000 },
      { date: new Date(end.getTime() + DAY), amountCents: 50_000 },
    ];
    expect(referenceFinalValue(flows, end, 0.08)).toBe(108_000);
  });
});
