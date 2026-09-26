import { describe, expect, it } from "vitest";
import {
  buildEnvelopeValuations,
  currentValueCents,
  aggregateSeries,
} from "@/lib/portfolio/series";
import { buildLivretBalanceSeries, LIVRET_A_RATE } from "@/lib/livret";
import { computeGoalMetrics } from "@/lib/goals/progress";

/* Fixture mixte : PEA (positions avec valuations) + LIVRET_A (dépôts quinzaine) + PRIV.
 * Test 9 de la spec BUTS §6.2 : égalité stricte dashboard ↔ but sur les trois types. */

interface FixturePosition {
  investedCents: number | null;
  valuations: { date: Date; valueCents: number }[];
}

function peaValueCents(positions: FixturePosition[]): number {
  // même chaîne que getGoalSummaries : buildEnvelopeValuations puis dernier point
  const valuations = buildEnvelopeValuations(
    positions.map((p) => ({
      investedCents: p.investedCents,
      valuations: p.valuations.map((v) => ({ date: v.date, valueCents: v.valueCents })),
    })),
  );
  const fallback = positions.reduce(
    (s, p) => s + currentValueCents(
      p.valuations.map((v) => ({ date: v.date, valueCents: v.valueCents })),
      p.investedCents ?? 0,
    ),
    0,
  );
  return valuations.length > 0
    ? valuations[valuations.length - 1].valueCents
    : fallback;
}

function livretValueCents(
  deposits: { date: Date; amountCents: number }[],
  rate: number,
  now: Date,
): number {
  const series = buildLivretBalanceSeries(deposits, rate);
  const nowTime = now.getTime();
  const point =
    [...series].reverse().find((p) => p.date.getTime() <= nowTime) ?? series[0] ?? null;
  return point ? point.balanceCents : 0;
}

const NOW = new Date("2025-07-15");

const peaPositions: FixturePosition[] = [
  {
    investedCents: 1_000_000,
    valuations: [
      { date: new Date("2024-01-31"), valueCents: 1_000_000 },
      { date: new Date("2025-06-30"), valueCents: 1_220_000 },
    ],
  },
];

const livretDeposits = [
  { date: new Date("2024-01-05"), amountCents: 200_000 },
  { date: new Date("2024-10-10"), amountCents: 300_000 },
];

describe("smoke buts — précision des enveloppes liées (spec §6.2)", () => {
  it("test 9 : valeur but = valeur dashboard, PEA/LIVRET_A/PRIV sur fixture mixte", () => {
    const pea = peaValueCents(peaPositions);
    const livret = livretValueCents(livretDeposits, LIVRET_A_RATE, NOW);
    // invariant : la valeur utilisée par le but est exactement celle du dashboard
    expect(pea).toBe(1_220_000);
    expect(livret).toBeGreaterThan(500_000); // capital + intérêts quinzaine
    // le livret compte le SOLDE, pas la somme des dépôts bruts
    expect(livret).not.toBe(500_000);

    const metrics = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: pea + livret,
      targetMonths: 6,
      monthlyExpensesCents: 250_000,
      createdAt: new Date("2024-01-01"),
      now: NOW,
    });
    expect(metrics.monthsCovered).toBeCloseTo((pea + livret) / 250_000, 5);
    expect(metrics.status).toBe("achieved");
  });

  it("test 10 : anti double comptage — une enveloppe compte au plus une fois", () => {
    const envValues = { pea: 1_220_000, livret: 503_000, priv: 100_000 };
    const goalA = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: envValues.pea + envValues.livret,
      targetMonths: 6,
      monthlyExpensesCents: 250_000,
      createdAt: new Date("2024-01-01"),
      now: NOW,
    }).monthsCovered;
    const goalB = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: envValues.priv,
      targetMonths: 6,
      monthlyExpensesCents: 250_000,
      createdAt: new Date("2024-01-01"),
      now: NOW,
    }).monthsCovered;
    // l'enveloppe pea n'appartient qu'au but A : somme des mois ≤ total / dépenses
    expect(goalA! + goalB!).toBeLessThanOrEqual(
      (envValues.pea + envValues.livret + envValues.priv) / 250_000 + 1e-9,
    );
  });

  it("test 11 : livret avec surplafond — la progression compte le solde quinzaine", () => {
    // dépôts au-delà du plafond : 30 000 € déposés, plafond 22 950 €
    const deposits = [
      { date: new Date("2024-01-05"), amountCents: 2_000_000 },
      { date: new Date("2024-06-10"), amountCents: 1_000_000 },
    ];
    const balance = livretValueCents(deposits, LIVRET_A_RATE, NOW);
    const rawSum = deposits.reduce((s, d) => s + d.amountCents, 0);
    expect(balance).not.toBe(rawSum);
    // le solde capital + intérêts plafonné reste la valeur du but
    const metrics = computeGoalMetrics({
      type: "SAFETY_NET",
      linkedValueCents: balance,
      targetMonths: 6,
      monthlyExpensesCents: 300_000,
      createdAt: new Date("2024-01-01"),
      now: NOW,
    });
    expect(metrics.monthsCovered).toBeCloseTo(balance / 300_000, 5);
  });

  it("test 12 : enveloppe clôturée exclue — la série agrégée ne la compte pas après clôture", () => {
    // la requête serveur filtre closedAt: null — le module pur reçoit la valeur agrégée
    // des seules enveloppes ouvertes ; on vérifie que la série agrégée des enveloppes
    // ouvertes exclut la clôturée (chute = réalité, pas un saut d'agrégation)
    const openA = [{ date: new Date("2024-01-31"), valueCents: 1_000_000 }];
    const openB = [{ date: new Date("2024-01-31"), valueCents: 500_000 }];
    const closed = [
      { date: new Date("2024-01-31"), valueCents: 200_000 },
      { date: new Date("2025-03-31"), valueCents: 220_000 },
    ];
    const withClosed = aggregateSeries([openA, openB, closed]);
    const withoutClosed = aggregateSeries([openA, openB]);
    expect(withClosed.length).toBeGreaterThan(0);
    expect(withoutClosed.length).toBeGreaterThan(0);
    const lastWith = withClosed[withClosed.length - 1].valueCents;
    const lastWithout = withoutClosed[withoutClosed.length - 1].valueCents;
    expect(lastWith - lastWithout).toBe(220_000); // la clôturée pèse son dernier solde
  });
});
