import { cache } from "react";
import { prisma } from "./db";
import { requireUserId } from "./auth";
import { buildEnvelopeValuations, currentValueCents } from "@/lib/portfolio/series";

export interface EnvelopeSummary {
  id: string;
  type: "PEA" | "CTO";
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
}

export const getEnvelopeSummaries = cache(async (): Promise<EnvelopeSummary[]> => {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    include: {
      positions: {
        select: {
          investedCents: true,
          valuations: { orderBy: { date: "asc" } },
        },
      },
      valuations: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return envelopes.map((e) => {
    const positionsInvestedCents = e.positions.reduce(
      (s, p) => s + (p.investedCents ?? 0),
      0,
    );
    const investedCents = e.depositsCents ?? positionsInvestedCents;
    const positionsValue = e.positions.reduce(
      (s, p) => s + currentValueCents(p.valuations, p.investedCents ?? 0),
      0,
    );
    const valuations = buildEnvelopeValuations(e.positions);
    const envelopeValue = valuations.length
      ? valuations[valuations.length - 1].valueCents
      : positionsValue;
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
      series: valuations,
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
