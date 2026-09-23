import { cache } from "react";
import { prisma } from "./db";
import { requireUserId } from "./auth";
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
  type: "PEA" | "CTO" | "LIVRET_A";
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
  envelopeType: "PEA" | "CTO" | "LIVRET_A";
  /** série du livret si applicable (solde quinzaine par quinzaine) */
  livretSeries?: { date: Date; balanceCents: number; overCapCents: number }[];
  /** paramètres livret */
  interestRate?: number | null;
  inflationRate?: number | null;
  /** part du solde au-dessus du plafond */
  overCapCents?: number;
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
          investedCents: true,
          boughtAt: true,
          valuations: { orderBy: { date: "asc" } },
          investments: { orderBy: { date: "asc" } },
        },
      },
      valuations: { orderBy: { date: "asc" } },
      deposits: { orderBy: { date: "asc" } },
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
    const livretSeries = e.type === "LIVRET_A" ? buildLivretBalanceSeries(livretEvents, livretRate) : [];
    const livretValue = livretSeries.length ? livretSeries[livretSeries.length - 1].balanceCents : 0;
    const envelopeValue =
      e.type === "LIVRET_A"
        ? livretValue
        : valuations.length
          ? valuations[valuations.length - 1].valueCents
          : positionsValue;
    const effectiveSeries: ValuationPoint[] =
      e.type === "LIVRET_A"
        ? livretSeries.map((p) => ({ date: p.date, valueCents: p.balanceCents }))
        : valuations;
    const hasUnknownInvested =
      e.depositsCents === null && e.positions.some((p) => p.investedCents === null);
    const gainCents = hasUnknownInvested ? null : envelopeValue - investedCents;
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
      series: effectiveSeries,
      investedSeries:
        e.type === "LIVRET_A"
          ? buildLivretBalanceSeries(livretEvents, 0)
              .filter((p) => p.date.getTime() <= Date.now())
              .map((p) => ({ date: p.date, valueCents: p.depositedCents }))
          : buildEnvelopeInvestedSeries(e.positions),
      envelopeType: e.type,
      ...(e.type === "LIVRET_A"
        ? (() => {
            const inflation = e.inflationRate ?? LIVRET_A_DEFAULT_INFLATION;
            const projection = projectOneYear(livretEvents, livretRate, inflation);
            return {
              livretSeries: livretSeries.map((p) => ({
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
