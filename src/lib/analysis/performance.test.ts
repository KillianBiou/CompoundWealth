import { describe, expect, it } from "vitest";
import {
  computePerformanceMetrics,
  mergeCashFlows,
  modifiedDietzReturn,
  positionCashFlows,
  referenceFinalValue,
  toUtcMidnight,
  xirr,
  type CashFlow,
} from "./performance";

const DAY = 24 * 3600 * 1000;

function addMonths(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + n);
  return copy;
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
      { date: new Date("2024-01-15T00:00:00Z"), amountCents: 100_000 },
      { date: new Date("2024-02-15T00:00:00Z"), amountCents: 50_000 },
    ]);
  });

  it("retombe sur l'investi total daté du premier achat", () => {
    const flows = positionCashFlows({
      investments: [],
      investedCents: 120_000,
      boughtAt: new Date("2024-03-01"),
    });
    expect(flows).toEqual([
      { date: new Date("2024-03-01T00:00:00Z"), amountCents: 120_000 },
    ]);
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

describe("toUtcMidnight", () => {
  it("normalise un dépôt livret à minuit Paris (22:00Z) en minuit UTC", () => {
    const parisMidnight = new Date("2026-05-31T22:00:00.000Z");
    expect(toUtcMidnight(parisMidnight).toISOString()).toBe(
      "2026-05-31T00:00:00.000Z",
    );
  });

  it("tronque l'heure sans décaler le jour affiché", () => {
    const d = new Date("2024-01-15T22:30:00.000Z");
    expect(toUtcMidnight(d).toISOString()).toBe("2024-01-15T00:00:00.000Z");
  });
});

describe("mergeCashFlows", () => {
  it("fusionne et cumule les flux du même jour (après normalisation UTC)", () => {
    const merged = mergeCashFlows([
      { date: new Date("2024-01-15"), amountCents: 100 },
      { date: new Date("2024-01-15T22:00:00.000Z"), amountCents: 50 },
      { date: new Date("2024-02-15"), amountCents: 200 },
    ]);
    expect(merged).toEqual([
      { date: new Date("2024-01-15T00:00:00Z"), amountCents: 150 },
      { date: new Date("2024-02-15T00:00:00Z"), amountCents: 200 },
    ]);
  });
});

describe("xirr", () => {
  it("exemple DCA de l'énoncé : €10 450 sur 14 mois → €11 231, XIRR > rendement simple", () => {
    const end = new Date("2025-02-28");
    const flows: CashFlow[] = [];
    // 14 versements mensuels ≈ 10 450 € au total, dernier versement réduit
    const amounts = [
      750_00, 750_00, 750_00, 750_00, 750_00, 750_00, 750_00, 750_00,
      750_00, 750_00, 750_00, 750_00, 750_00, 700_00,
    ];
    amounts.forEach((amountCents, i) => {
      flows.push({ date: addMonths(end, -(13 - i)), amountCents });
    });
    const total = amounts.reduce((s, a) => s + a, 0);
    expect(total).toBe(10_450_00);
    const rate = xirr(flows, 11_231_00, end);
    expect(rate).not.toBeNull();
    // le rendement simple sous-estime la performance réelle en marché
    // haussier : l'argent n'était pas investi toute la période
    const simple = (11_231_00 - total) / total;
    expect(rate!).toBeGreaterThan(simple);
    // racine = convention Excel Act/365 (jours entiers) sur ces flux exacts
    expect(rate!).toBeCloseTo(0.1386, 2);
  });

  it("versement unique conservé 1 an avec +10 % → XIRR Excel = 9,97 % (366 jours)", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: new Date("2024-01-01"), amountCents: 100_000 }];
    // Excel XIRR compte 366 jours pour 2024 (bissextile) → racine 9,97 %
    const rate = xirr(flows, 110_000, end);
    expect(rate).toBeCloseTo(0.0997, 3);
  });

  it("XIRR insensible à l'heure du flux (22:00Z vs 00:00Z, même jour)", () => {
    const end = new Date("2025-01-01");
    const a = xirr(
      [{ date: new Date("2024-01-01T22:00:00.000Z"), amountCents: 100_000 }],
      110_000,
      end,
    );
    const b = xirr(
      [{ date: new Date("2024-01-01T00:00:00.000Z"), amountCents: 100_000 }],
      110_000,
      end,
    );
    expect(a).toBeCloseTo(b!, 8);
  });

  it("DCA 12 mois, marché +10 % : le XIRR est bien plus élevé que le simple", () => {
    // 12 versements de 1 500 €, marché +10 % sur l'année → valeur finale
    // = somme des versements capitalisés à 10 % jusqu'à la fin
    const end = new Date("2025-01-01");
    const flows: CashFlow[] = [];
    for (let i = 0; i < 12; i += 1) {
      flows.push({ date: addMonths(end, -(11 - i)), amountCents: 150_000 });
    }
    let finalValue = 0;
    for (const flow of flows) {
      const days = Math.round((end.getTime() - flow.date.getTime()) / DAY);
      finalValue += flow.amountCents * Math.pow(1.1, days / 365);
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
      xirr([{ date: new Date("2024-01-01"), amountCents: 100_000 }], 0, end),
    ).toBeNull();
  });

  it("gère un rendement négatif", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: new Date("2024-01-01"), amountCents: 100_000 }];
    const rate = xirr(flows, 80_000, end);
    expect(rate).toBeCloseTo(-0.1995, 2);
  });
});

describe("modifiedDietzReturn (TWR approché)", () => {
  it("avec un seul flux, TWR cumulé = rendement simple", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: new Date("2024-01-01"), amountCents: 100_000 }];
    const result = modifiedDietzReturn(flows, 108_000, end);
    const simple = (108_000 - 100_000) / 100_000;
    expect(result).not.toBeNull();
    expect(result!.cumulative).toBeCloseTo(simple, 6);
  });

  it("position quasi flat avec beaucoup de versements : TWR ≈ rendement simple", () => {
    // 24 versements mensuels, gain quasi nul : le TWR ne doit pas diverger
    const end = new Date("2025-01-01");
    const flows: CashFlow[] = [];
    for (let i = 0; i < 24; i += 1) {
      flows.push({ date: new Date(end.getTime() - (24 - i) * 30 * DAY), amountCents: 10_000 });
    }
    const contributed = 240_000;
    const finalValue = 240_500; // gain réel +0,2 %
    const result = modifiedDietzReturn(flows, finalValue, end);
    const simple = (finalValue - contributed) / contributed;
    expect(result).not.toBeNull();
    // TWR du même ordre que le simple, jamais plusieurs dizaines de fois
    expect(Math.abs(result!.cumulative - simple)).toBeLessThan(0.02);
    expect(result!.cumulative).toBeLessThan(0.05);
  });

  it("le TWR ne gonfle pas avec le nombre de versements à gain constant", () => {
    // bug historique : +87 % de TWR affiché pour +2,9 % de gain réel
    const end = new Date("2025-01-01");
    const dietzFor = (n: number, gainCents: number) => {
      const flows: CashFlow[] = [];
      for (let i = 0; i < n; i += 1) {
        flows.push({
          date: new Date(end.getTime() - (n - i) * 30 * DAY),
          amountCents: 10_000,
        });
      }
      return modifiedDietzReturn(flows, n * 10_000 + gainCents, end);
    };
    const few = dietzFor(2, 580);
    const many = dietzFor(24, 580);
    expect(few!.cumulative).toBeCloseTo(0.0387, 3);
    // même gain, 12× plus de versements : TWR reste < 1 %, du même ordre
    // de grandeur que le rendement simple (+2,9 %), sans multiplier par 30
    expect(many!.cumulative).toBeCloseTo(0.0046, 3);
    expect(Math.abs(many!.cumulative)).toBeLessThan(0.05);
  });

  it("annualise géométriquement si la période dépasse un an, sinon null", () => {
    const end = new Date("2025-06-01");
    const flows = [{ date: new Date("2024-06-01"), amountCents: 100_000 }];
    const oneYear = modifiedDietzReturn(flows, 110_000, end);
    expect(oneYear!.annualized).toBeNull();

    const end2 = new Date("2026-06-01");
    const twoYears = modifiedDietzReturn(flows, 121_000, end2);
    expect(twoYears!.annualized).toBeCloseTo(0.1, 2);
  });

  it("dénominateur nul ou période nulle → null", () => {
    expect(modifiedDietzReturn([], 100, new Date())).toBeNull();
    const d = new Date("2025-01-01");
    expect(
      modifiedDietzReturn([{ date: d, amountCents: 100 }], 100, d),
    ).toBeNull();
  });
});

describe("computePerformanceMetrics", () => {
  it("retourne simple, gain, contributions, XIRR et TWR cohérents", () => {
    const end = new Date("2025-01-01");
    const flows = [{ date: new Date("2024-01-01"), amountCents: 100_000 }];
    const result = computePerformanceMetrics({
      flows,
      finalValueCents: 108_000,
      finalDate: end,
    });
    expect(result.simpleReturn).toBeCloseTo(0.08, 4);
    expect(result.gainCents).toBe(8_000);
    expect(result.contributedCents).toBe(100_000);
    expect(result.xirr).toBeCloseTo(0.0798, 3);
    expect(result.twrCumulative).toBeCloseTo(0.08, 4);
    // cohérence : avec un flux unique, TWR cumulé ≈ rendement simple
    expect(Math.abs(result.twrCumulative! - result.simpleReturn!)).toBeLessThan(
      1e-6,
    );
    expect(result.years).toBeCloseTo(366 / 365, 3);
  });

  it("années = différence de dates réelle (365 jours pour 2025-09-25 → 2026-09-25)", () => {
    const result = computePerformanceMetrics({
      flows: [{ date: new Date("2025-09-25"), amountCents: 100_000 }],
      finalValueCents: 110_000,
      finalDate: new Date("2026-09-25"),
    });
    expect(result.years).toBeCloseTo(1, 6);
  });

  it("ignore les flux postérieurs à la date finale", () => {
    const result = computePerformanceMetrics({
      flows: [
        { date: new Date("2024-01-01"), amountCents: 100_000 },
        { date: new Date("2025-06-01"), amountCents: 50_000 },
      ],
      finalValueCents: 108_000,
      finalDate: new Date("2025-01-01"),
    });
    expect(result.contributedCents).toBe(100_000);
  });

  it("sous-période : le capital au cutoff joue le rôle du premier versement", () => {
    // cutoff 2024-01-15 : 100 000 € déjà présents, +50 000 € versés mi-2024,
    // valeur finale 165 000 € → XIRR ≈ 12,02 %, Dietz ≈ 11,99 % (vérifiés)
    const result = computePerformanceMetrics({
      flows: [
        { date: new Date("2024-01-15"), amountCents: 100_000 },
        { date: new Date("2024-07-15"), amountCents: 50_000 },
      ],
      finalValueCents: 165_000,
      finalDate: new Date("2025-01-15"),
      startDate: new Date("2024-01-15"),
      startValueCents: 100_000,
    });
    // seul le flux post-cutoff compte comme versement de la période
    expect(result.contributedCents).toBe(50_000);
    expect(result.gainCents).toBe(15_000);
    expect(result.simpleReturn).toBeCloseTo(0.1, 4);
    expect(result.xirr).toBeCloseTo(0.1202, 3);
    expect(result.twrCumulative).toBeCloseTo(0.1199, 3);
  });
  it("sous-période sans flux : Dietz = rendement simple du capital initial", () => {
    const result = computePerformanceMetrics({
      flows: [{ date: new Date("2024-01-15"), amountCents: 100_000 }],
      finalValueCents: 108_000,
      finalDate: new Date("2025-01-15"),
      startDate: new Date("2024-01-15"),
      startValueCents: 100_000,
    });
    expect(result.contributedCents).toBe(0);
    expect(result.gainCents).toBe(8_000);
    expect(result.simpleReturn).toBeCloseTo(0.08, 4);
    expect(result.twrCumulative).toBeCloseTo(0.08, 4);
    expect(result.xirr).toBeCloseTo(0.0798, 3);
  });
  it("données insuffisantes (< 30 jours) → métriques null", () => {
    const end = new Date("2025-01-30");
    const flows = [{ date: new Date("2025-01-01"), amountCents: 100_000 }];
    const result = computePerformanceMetrics({
      flows,
      finalValueCents: 101_000,
      finalDate: end,
    });
    expect(result.xirr).toBeNull();
    expect(result.twrAnnualized).toBeNull();
    expect(result.twrCumulative).toBeNull();
    expect(result.simpleReturn).toBeCloseTo(0.01, 4);
  });
});

describe("referenceFinalValue", () => {
  it("capitalise chaque versement au taux de référence jusqu'à la fin", () => {
    const end = new Date("2025-01-01");
    const flows = [
      { date: new Date("2024-01-01"), amountCents: 100_000 },
      { date: new Date("2025-01-01"), amountCents: 50_000 },
    ];
    const value = referenceFinalValue(flows, end, 0.08);
    // 366 jours à 8 % (convention Act/365) + versement du jour
    expect(value).toBe(Math.round(100_000 * Math.pow(1.08, 366 / 365) + 50_000));
  });

  it("le gain de la référence Monde est toujours > gain Livret sur la même période", () => {
    const end = new Date("2025-01-01");
    const flows = [
      { date: new Date("2024-01-01"), amountCents: 100_000 },
      { date: new Date("2024-07-01"), amountCents: 50_000 },
    ];
    const contributed = 150_000;
    const savings = referenceFinalValue(flows, end, 0.017);
    const world = referenceFinalValue(flows, end, 0.08);
    expect(world - contributed).toBeGreaterThan(savings - contributed);
  });

  it("ignore les flux postérieurs à la date finale", () => {
    const end = new Date("2025-01-01");
    const flows = [
      { date: new Date("2024-01-01"), amountCents: 100_000 },
      { date: new Date(end.getTime() + DAY), amountCents: 50_000 },
    ];
    expect(referenceFinalValue(flows, end, 0.08)).toBe(
      Math.round(100_000 * Math.pow(1.08, 366 / 365)),
    );
  });
  it("sous-période : le capital initial est aussi placé au taux de référence", () => {
    const end = new Date("2025-01-15");
    const start = new Date("2024-01-15");
    const flows = [{ date: new Date("2024-07-15"), amountCents: 50_000 }];
    const value = referenceFinalValue(flows, end, 0.08, 100_000, start);
    // 366 jours pour le capital, 184 pour le versement (Act/365)
    expect(value).toBe(
      Math.round(
        100_000 * Math.pow(1.08, 366 / 365) +
          50_000 * Math.pow(1.08, 184 / 365),
      ),
    );
  });
});
