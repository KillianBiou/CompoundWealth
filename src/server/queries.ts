import { cache } from "react";
import { prisma } from "./db";
import { requireUserId } from "./auth";

export interface EnvelopeSummary {
  id: string;
  type: "PEA" | "CTO";
  name: string;
  broker: string | null;
  openedAt: Date | null;
  closedAt: Date | null;
  investedCents: number;
  valueCents: number;
  gainCents: number;
  positionsCount: number;
  series: { date: Date; valueCents: number }[];
}

export const getEnvelopeSummaries = cache(async (): Promise<EnvelopeSummary[]> => {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    include: {
      positions: { select: { investedCents: true } },
      valuations: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return envelopes.map((e) => {
    const investedCents = e.positions.reduce((s, p) => s + p.investedCents, 0);
    const valueCents =
      e.valuations.length > 0
        ? e.valuations[e.valuations.length - 1].valueCents
        : investedCents;
    return {
      id: e.id,
      type: e.type,
      name: e.name,
      broker: e.broker,
      openedAt: e.openedAt,
      closedAt: e.closedAt,
      investedCents,
      valueCents,
      gainCents: valueCents - investedCents,
      positionsCount: e.positions.length,
      series: e.valuations.map((v) => ({ date: v.date, valueCents: v.valueCents })),
    };
  });
});

export const getEnvelope = cache(async (envelopeId: string) => {
  const userId = await requireUserId();
  return prisma.envelope.findFirst({
    where: { id: envelopeId, userId },
    include: {
      positions: { orderBy: { boughtAt: "desc" } },
      valuations: { orderBy: { date: "asc" } },
    },
  });
});

export const getCurrentUser = cache(async () => {
  const userId = await requireUserId();
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, age: true, job: true, salaryCents: true },
  });
});
