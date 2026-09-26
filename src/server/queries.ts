import { cache } from "react";
import { prisma } from "./db";
import { requireUserId } from "./auth";
import { windowSummaries, type DcaPricedLine } from "@/lib/dca";
import {
  buildEnvelopeInvestedSeries,
  buildEnvelopeValuations,
  currentValueCents,
  type ValuationPoint,
} from "@/lib/portfolio/series";
import {
  buildLivretBalanceSeries,
  LIVRET_A_DEFAULT_INFLATION,
  LIVRET_A_RATE,
  projectOneYear,
  type LivretEvent,
} from "@/lib/livret";

export interface EnvelopeSummary {
  id: string;
  type: "PEA" | "CTO" | "LIVRET_A" | "PRIV";
  name: string;
  broker: string | null;
  openedAt: Date | null;
  closedAt: Date | null;
  investedCents: number;
  /** true si au moins une position n'a pas de montant investi (état des lieux) */
  hasUnknownInvested: boolean;
  valueCents: number;
  gainCents: number | null;
  positionsCount: number;
  series: { date: Date; valueCents: number }[];
  /** cumul des sommes investies au fil du temps (versements détaillés si présents) */
  investedSeries: { date: Date; valueCents: number }[];
  /** type d'enveloppe */
  envelopeType: "PEA" | "CTO" | "LIVRET_A" | "PRIV";
  /** série du livret si applicable (solde quinzaine par quinzaine) */
  livretSeries?: { date: Date; balanceCents: number; overCapCents: number }[];
  /** paramètres livret */
  interestRate?: number | null;
  inflationRate?: number | null;
  /** part du solde au-dessus du plafond */
  overCapCents?: number;
  /** DCA actif : total mensuel estimé en centimes et nombre de versements sur 1 mois */
  dcaMonthlyCents?: number;
  dcaMonthlyPayments?: number;
  /** positions triées par valeur décroissante (vue détaillée du dashboard) */
  topPositions?: {
    name: string;
    symbol: string | null;
    valueCents: number;
  }[];
  /** projection 1 an : perte de pouvoir d'achat */
  projection?: {
    interestCents: number;
    inflationLossCents: number;
    overCapCents: number;
    realBalanceCents: number;
    realChangeCents: number;
    realRate: number;
  } | null;
}

export const getEnvelopeSummaries = cache(async (): Promise<EnvelopeSummary[]> => {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    include: {
      positions: {
        select: {
          name: true,
          symbol: true,
          investedCents: true,
          boughtAt: true,
          valuations: { orderBy: { date: "asc" } },
          investments: { orderBy: { date: "asc" } },
        },
      },
      valuations: { orderBy: { date: "asc" } },
      deposits: { orderBy: { date: "asc" } },
      dcaPlans: { include: { lines: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return envelopes.map((e) => {
    const positionsInvestedCents = e.positions.reduce(
      (s, p) => s + (p.investedCents ?? 0),
      0,
    );
    const livretEvents: LivretEvent[] =
      e.type === "LIVRET_A"
        ? e.deposits.map((dep) => ({ date: dep.date, amountCents: dep.amountCents }))
        : [];
    const livretRate = e.interestRate ?? LIVRET_A_RATE;
    const investedCents =
      e.type === "LIVRET_A"
        ? e.deposits.reduce((s, dep) => s + dep.amountCents, 0)
        : (e.depositsCents ?? positionsInvestedCents);
    const positionsValue = e.positions.reduce(
      (s, p) => s + currentValueCents(p.valuations, p.investedCents ?? 0),
      0,
    );
    const valuations = buildEnvelopeValuations(e.positions);
    const nowTime = Date.now();
    const livretSeriesFull =
      e.type === "LIVRET_A" ? buildLivretBalanceSeries(livretEvents, livretRate) : [];
    const livretCurrentPoint =
      e.type === "LIVRET_A"
        ? ([...livretSeriesFull].reverse().find((p) => p.date.getTime() <= nowTime) ??
          livretSeriesFull[0] ??
          null)
        : null;
    const livretValue = livretCurrentPoint ? livretCurrentPoint.balanceCents : 0;
    const envelopeValue =
      e.type === "LIVRET_A"
        ? livretValue
        : valuations.length
          ? valuations[valuations.length - 1].valueCents
          : positionsValue;
    const effectiveSeries: ValuationPoint[] =
      e.type === "LIVRET_A"
        ? livretSeriesFull
            .filter((p) => p.date.getTime() <= nowTime)
            .map((p) => ({ date: p.date, valueCents: p.balanceCents }))
        : valuations;
    const dcaLines: DcaPricedLine[] = e.dcaPlans.flatMap((plan) =>
      plan.lines.map((line) => ({
        plan: { frequency: plan.frequency, startDate: plan.startDate, active: plan.active },
        line: { isin: line.isin, maxAmountCents: line.maxAmountCents, active: line.active },
        priceCents: null,
      })),
    );
    const dcaMonthly = dcaLines.length
      ? windowSummaries(dcaLines, e.type)[ "1m" ]
      : { totalMaxCents: 0, totalEstimatedCents: 0, paymentsCount: 0 };
    const hasUnknownInvested =
      e.depositsCents === null && e.positions.some((p) => p.investedCents === null);
    const gainCents = hasUnknownInvested ? null : envelopeValue - investedCents;
    const topPositions =
      e.type === "LIVRET_A"
        ? []
        : e.positions
            .map((p) => ({
              name: p.name,
              symbol: p.symbol,
              valueCents: currentValueCents(p.valuations, p.investedCents ?? 0),
            }))
            .sort((a, b) => b.valueCents - a.valueCents);
    return {
      id: e.id,
      type: e.type,
      name: e.name,
      broker: e.broker,
      openedAt: e.openedAt,
      closedAt: e.closedAt,
      investedCents,
      hasUnknownInvested,
      valueCents: envelopeValue,
      gainCents,
      positionsCount: e.positions.length,
      topPositions,
      series: effectiveSeries,
      investedSeries:
        e.type === "LIVRET_A"
          ? buildLivretBalanceSeries(livretEvents, 0)
              .filter((p) => p.date.getTime() <= Date.now())
              .map((p) => ({ date: p.date, valueCents: p.depositedCents }))
          : buildEnvelopeInvestedSeries(e.positions),
      envelopeType: e.type,
      ...(dcaMonthly.totalMaxCents > 0
        ? {
            dcaMonthlyCents: dcaMonthly.totalEstimatedCents,
            dcaMonthlyPayments: dcaMonthly.paymentsCount,
          }
        : {}),
      ...(e.type === "LIVRET_A"
        ? (() => {
            const inflation = e.inflationRate ?? LIVRET_A_DEFAULT_INFLATION;
            const projection = projectOneYear(livretEvents, livretRate, inflation);
            return {
              livretSeries: livretSeriesFull.map((p) => ({
                date: p.date,
                balanceCents: p.balanceCents,
                overCapCents: p.overCapCents,
              })),
              interestRate: e.interestRate,
              inflationRate: e.inflationRate,
              overCapCents: projection?.overCapCents ?? 0,
              projection: projection
                ? {
                    interestCents: projection.interestCents,
                    inflationLossCents: projection.inflationLossCents,
                    overCapCents: projection.overCapCents,
                    realBalanceCents: projection.realBalanceCents,
                    realChangeCents: projection.realChangeCents,
                    realRate: projection.realRate,
                  }
                : null,
            };
          })()
        : {}),
    };
  });
});

export const getEnvelope = cache(async (envelopeId: string) => {
  const userId = await requireUserId();
  return prisma.envelope.findFirst({
    where: { id: envelopeId, userId },
    include: {
      positions: {
        include: {
          valuations: { orderBy: { date: "asc" } },
          investments: { orderBy: { date: "asc" } },
        },
        orderBy: { boughtAt: "desc" },
      },
      dcaPlans: {
        include: { lines: true },
        orderBy: { createdAt: "asc" },
      },
      valuations: { orderBy: { date: "asc" } },
      deposits: { orderBy: { date: "asc" } },
    },
  });
});

export const getCurrentUser = cache(async () => {
  const userId = await requireUserId();
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      age: true,
      job: true,
      salaryCents: true,
      currency: true,
      numberLocale: true,
    },
  });
});

/* -------------------------------------------------------------------------- */
/*                    Données de copie presse-papier                          */
/* -------------------------------------------------------------------------- */

/**
 * Enveloppes sérialisables pour la copie presse-papier : tout ce qu'il faut
 * pour recréer le portefeuille (type, broker, valeurs, positions avec ISIN,
 * catégorie, investi, valorisation, versements, dépôts livret, DCA actifs).
 */
export const getEnvelopeClipboardData = cache(async (): Promise<
  import("@/lib/clipboard").ClipboardEnvelope[]
> => {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    include: {
      positions: {
        select: {
          name: true,
          symbol: true,
          category: true,
          quantity: true,
          investedCents: true,
          boughtAt: true,
          valuations: { orderBy: { date: "asc" } },
          investments: { orderBy: { date: "asc" } },
        },
        orderBy: { boughtAt: "asc" },
      },
      deposits: { orderBy: { date: "asc" } },
      dcaPlans: { include: { lines: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return envelopes.map((e) => {
    const isinOfPos = (p: (typeof e.positions)[number]) => {
      const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
      const symbol = p.symbol?.trim().toUpperCase() ?? "";
      if (ISIN_PATTERN.test(symbol)) return symbol;
      const fromName = p.name.match(/[A-Z]{2}[A-Z0-9]{9}[0-9]/);
      return fromName ? fromName[0] : null;
    };
    const positionsValue = e.positions.reduce(
      (s, p) => s + currentValueCents(p.valuations, p.investedCents ?? 0),
      0,
    );
    const valuations = buildEnvelopeValuations(e.positions);
    const valueCents =
      e.type === "LIVRET_A"
        ? (() => {
            const events = e.deposits.map((dep) => ({
              date: dep.date,
              amountCents: dep.amountCents,
            }));
            const series = buildLivretBalanceSeries(events, e.interestRate ?? LIVRET_A_RATE);
            const nowTime = Date.now();
            const current =
              [...series].reverse().find((p) => p.date.getTime() <= nowTime) ??
              series[0] ??
              null;
            return current ? current.balanceCents : 0;
          })()
        : valuations.length
          ? valuations[valuations.length - 1].valueCents
          : positionsValue;
    const investedCents =
      e.type === "LIVRET_A"
        ? e.deposits.reduce((s, dep) => s + dep.amountCents, 0)
        : e.depositsCents ?? e.positions.reduce((s, p) => s + (p.investedCents ?? 0), 0);
    return {
      name: e.name,
      type: e.type,
      broker: e.broker,
      openedAt: e.openedAt,
      valueCents,
      investedCents,
      positions:
        e.type === "LIVRET_A"
          ? []
          : e.positions.map((p) => ({
              name: p.name,
              symbol: p.symbol,
              isin: isinOfPos(p),
              category: p.category,
              quantity: p.quantity,
              investedCents: p.investedCents,
              currentValueCents: currentValueCents(p.valuations, p.investedCents ?? 0),
              boughtAt: p.boughtAt,
              valuationDate: p.valuations.length > 0 ? p.valuations[p.valuations.length - 1].date : null,
              investments: p.investments.map((inv) => ({
                date: inv.date,
                amountCents: inv.amountCents,
              })),
            })),
      deposits:
        e.type === "LIVRET_A"
          ? e.deposits.map((dep) => ({ date: dep.date, amountCents: dep.amountCents }))
          : undefined,
      interestRate: e.type === "LIVRET_A" ? e.interestRate : undefined,
      dcaLines: e.dcaPlans
        .filter((plan) => plan.active)
        .flatMap((plan) =>
          plan.lines
            .filter((line) => line.active)
            .map((line) => ({
              isin: line.isin,
              name: line.name,
              maxAmountCents: line.maxAmountCents,
              frequency: plan.frequency,
            })),
        ),
    };
  });
});

/* -------------------------------------------------------------------------- */
/*                                  Buts                                       */
/* -------------------------------------------------------------------------- */

import {
  buildGoalMonthlySeries,
  computeGoalMetrics,
  type GoalStatus,
  type GoalType,
  type GoalMetrics,
} from "@/lib/goals/progress";
import { aggregateSeries } from "@/lib/portfolio/series";
import {
  DEFAULT_EQUITY_RETURN,
  historicalCagr,
} from "@/lib/analysis/scanners";

export interface GoalEnvelopeSummary {
  id: string;
  name: string;
  type: "PEA" | "CTO" | "LIVRET_A" | "PRIV";
  broker: string | null;
  /** valeur actuelle — STRICTEMENT identique à EnvelopeSummary.valueCents */
  valueCents: number;
  /** série de valorisation (interpolation plate) */
  series: { date: Date; valueCents: number }[];
  /** DCA mensuel actif en centimes (préfill de contribution) */
  dcaMonthlyCents: number;
  closedAt: Date | null;
}

export interface GoalSummary {
  id: string;
  type: GoalType;
  name: string;
  icon: string;
  targetAmountCents: number | null;
  targetRentCents: number | null;
  targetMonths: number | null;
  targetDate: Date | null;
  withdrawalRate: number | null;
  monthlyExpensesCents: number | null;
  monthlyContributionCents: number | null;
  createdAt: Date;
  envelopes: GoalEnvelopeSummary[];
  /** valeur actuelle des enveloppes liées ouvertes */
  linkedValueCents: number;
  /** contribution mensuelle totale (déclarée + DCA des enveloppes liées) */
  effectiveMonthlyContributionCents: number;
  metrics: GoalMetrics;
  /** série mensuelle de la métrique du but */
  monthlySeries: { date: Date; valueCents: number; metric: number }[];
  /** série agrégée des enveloppes liées (graphique valeur) */
  linkedSeries: { date: Date; valueCents: number }[];
}

/** Catégories d'affichage de la liste des buts. */
export const GOAL_CATEGORY_ORDER: Record<GoalType, number> = {
  SAFETY_NET: 0,
  FIRE: 1,
  RETIREMENT: 2,
  DOWN_PAYMENT: 3,
  CUSTOM_LIFEVENT: 4,
  CUSTOM: 5,
};

export const getGoalSummaries = cache(async (): Promise<GoalSummary[]> => {
  const userId = await requireUserId();
  const goals = await prisma.goal.findMany({
    where: { userId },
    include: {
      envelopes: {
        where: { closedAt: null },
        include: {
          positions: {
            select: {
              investedCents: true,
              boughtAt: true,
              valuations: { orderBy: { date: "asc" } },
              investments: { orderBy: { date: "asc" } },
            },
          },
          deposits: { orderBy: { date: "asc" } },
          dcaPlans: { include: { lines: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (goals.length === 0) return [];

  // rendement attendu du portefeuille global (historique si assez de données)
  const summaries = await getEnvelopeSummaries();
  const wealthSeries = aggregateSeries(summaries.map((e) => e.series));
  const investedSeriesAgg = aggregateSeries(summaries.map((e) => e.investedSeries));
  const historicalReturn = historicalCagr(wealthSeries, investedSeriesAgg);
  const expectedReturn = historicalReturn ?? DEFAULT_EQUITY_RETURN;

  return goals.map((goal) => {
    const now = new Date();
    const envelopes: GoalEnvelopeSummary[] = goal.envelopes.map((e) => {
      // même chaîne de valorisation que getEnvelopeSummaries — invariant strict
      const positionsValue = e.positions.reduce(
        (s, p) =>
          s +
          currentValueCents(p.valuations, p.investedCents ?? 0),
        0,
      );
      const valuations = buildEnvelopeValuations(e.positions);
      const isLivret = e.type === "LIVRET_A";
      const livretRate = e.interestRate ?? LIVRET_A_RATE;
      const livretSeries = isLivret
        ? buildLivretBalanceSeries(
            e.deposits.map((d) => ({ date: d.date, amountCents: d.amountCents })),
            livretRate,
          )
        : [];
      const nowTime = now.getTime();
      const livretPoint = isLivret
        ? [...livretSeries].reverse().find((p) => p.date.getTime() <= nowTime) ??
          livretSeries[0] ??
          null
        : null;
      const valueCents = isLivret
        ? (livretPoint?.balanceCents ?? 0)
        : valuations.length > 0
          ? valuations[valuations.length - 1].valueCents
          : positionsValue;
      const series = isLivret
        ? livretSeries
            .filter((p) => p.date.getTime() <= nowTime)
            .map((p) => ({ date: p.date, valueCents: p.balanceCents }))
        : valuations;
      const dcaMonthly = e.dcaPlans
        .filter((p) => p.active)
        .reduce((s, p) => s + p.lines.reduce((ls, l) => ls + l.maxAmountCents, 0), 0);
      return {
        id: e.id,
        name: e.name,
        type: e.type,
        broker: e.broker,
        valueCents,
        series,
        dcaMonthlyCents: dcaMonthly,
        closedAt: e.closedAt,
      };
    });

    const linkedValueCents = envelopes.reduce((s, e) => s + e.valueCents, 0);
    const dcaTotal = envelopes.reduce((s, e) => s + e.dcaMonthlyCents, 0);
    const contribution = (goal.monthlyContributionCents ?? 0) + dcaTotal;

    const metrics = computeGoalMetrics({
      type: goal.type,
      linkedValueCents,
      targetAmountCents: goal.targetAmountCents,
      targetRentCents: goal.targetRentCents,
      targetMonths: goal.targetMonths,
      monthlyExpensesCents: goal.monthlyExpensesCents,
      withdrawalRate: goal.withdrawalRate,
      monthlyContributionCents: contribution,
      targetDate: goal.targetDate,
      createdAt: goal.createdAt,
      expectedReturn,
      now,
    });

    const linkedSeries = aggregateSeries(envelopes.map((e) => e.series));

    const monthlySeries = buildGoalMonthlySeries({
      type: goal.type,
      targetAmountCents: goal.targetAmountCents,
      targetRentCents: goal.targetRentCents,
      targetMonths: goal.targetMonths,
      monthlyExpensesCents: goal.monthlyExpensesCents,
      withdrawalRate: goal.withdrawalRate,
      createdAt: goal.createdAt,
      series: linkedSeries,
      now,
    });

    return {
      id: goal.id,
      type: goal.type,
      name: goal.name,
      icon: goal.icon,
      targetAmountCents: goal.targetAmountCents,
      targetRentCents: goal.targetRentCents,
      targetMonths: goal.targetMonths,
      targetDate: goal.targetDate,
      withdrawalRate: goal.withdrawalRate,
      monthlyExpensesCents: goal.monthlyExpensesCents,
      monthlyContributionCents: goal.monthlyContributionCents,
      createdAt: goal.createdAt,
      envelopes,
      linkedValueCents,
      effectiveMonthlyContributionCents: contribution,
      metrics,
      monthlySeries,
      linkedSeries,
    };
  });
});

/** Un seul but par id (détail). */
export const getGoal = cache(async (goalId: string): Promise<GoalSummary | null> => {
  const summaries = await getGoalSummaries();
  return summaries.find((g) => g.id === goalId) ?? null;
});

/** Enveloppes disponibles pour lier à un but : ouvertes, non clôturées. */
export const getLinkableEnvelopes = cache(async () => {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    select: { id: true, name: true, type: true, broker: true, goalId: true },
    orderBy: { createdAt: "asc" },
  });
  return envelopes;
});

/** Statut combiné pour la carte dashboard (léger, sans séries). */
export const getGoalsCombinedStatus = cache(
  async (): Promise<{ total: number; onTrack: number; needsAttention: number }> => {
    const summaries = await getGoalSummaries();
    const needsAttention = summaries.filter((g) =>
      ["compromised", "underfunded", "late", "alert"].includes(g.metrics.status),
    ).length;
    return {
      total: summaries.length,
      onTrack: summaries.length - needsAttention,
      needsAttention,
    };
  },
);
