import { cache } from "react";
import { prisma } from "./db";
import { requireUserId } from "./auth";
import { currentValueCents } from "@/lib/portfolio/series";
import { getEtfByIsin, getEtfByTicker } from "@/lib/etf-catalog";
import { isUSStock } from "@/lib/analysis/exposure-catalog";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import { getEtfDetailByIsin, getEtfDetailByTicker, getAllEtfDetails } from "@/lib/analysis/etf-detail";
import {
  analyzeFees,
  analyzeIncome,
  analyzeRegions,
  analyzeSectors,
  averageMonthlySavings,
  estimateMonthlyExpenses,
  type AnalysisPosition,
  type FeeAnalysisResult,
  type IncomeAnalysisResult,
  type DiversificationResult,
} from "@/lib/analysis/scanners";

/* -------------------------------------------------------------------------- */
/*                          Positions agrégées d'analyse                       */
/* -------------------------------------------------------------------------- */

export function isinOf(position: { symbol: string | null; name: string }): string | null {
  const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
  const symbol = position.symbol?.trim().toUpperCase() ?? "";
  if (ISIN_PATTERN.test(symbol)) return symbol;
  // Les positions créées manuellement ou par DCA stockent le ticker (WPEA,
  // IFRE...) dans symbol : on le résout via le catalogue puis le CSV.
  const byTicker = getEtfByTicker(symbol);
  if (byTicker) return byTicker.isin;
  const detailByTicker = getEtfDetailByTicker(symbol);
  if (detailByTicker) return detailByTicker.isin;
  const fromName = position.name.match(/[A-Z]{2}[A-Z0-9]{9}[0-9]/);
  if (fromName) return fromName[0];
  const nameTicker = position.name.split(" — ")[0]?.trim().toUpperCase() ?? "";
  if (nameTicker) {
    const fromNameTicker = getEtfByTicker(nameTicker) ?? getEtfDetailByTicker(nameTicker);
    if (fromNameTicker) return fromNameTicker.isin;
  }
  return null;
}



export const getAnalysisPositions = cache(async (): Promise<AnalysisPosition[]> => {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    include: {
      positions: {
        select: {
          id: true,
          name: true,
          symbol: true,
          category: true,
          investedCents: true,
          quantity: true,
          boughtAt: true,
          valuations: { orderBy: { date: "asc" } },
          investments: { orderBy: { date: "asc" } },
          cashIncomes: { orderBy: { date: "asc" } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const positions: AnalysisPosition[] = [];
  for (const envelope of envelopes) {
    for (const position of envelope.positions) {
      const isin = isinOf(position);
      const etf = isin ? getEtfByIsin(isin) : null;
      const detail = isin ? getEtfDetailByIsin(isin) : null;
      const valueCents = currentValueCents(position.valuations, position.investedCents ?? 0);
      positions.push({
        id: position.id,
        name: position.name,
        isin,
        envelopeId: envelope.id,
        envelopeName: envelope.name,
        envelopeType: envelope.type,
        category: position.category,
        valueCents,
        investedCents: position.investedCents,
        ter: detail?.ter ?? etf?.ter ?? null,
        boughtAt: position.boughtAt,
        investments: position.investments.map((inv) => ({
          date: inv.date,
          amountCents: inv.amountCents,
        })),
        cashIncomeCents: position.cashIncomes.map((income) => ({
          date: income.date,
          amountCents: income.amountCents,
        })),
        isStock: position.category === "STOCK" || (isin ? isUSStock(isin) : false),
      });
    }
  }
  return positions;
});

/* -------------------------------------------------------------------------- */
/*                                  Scanners                                  */
/* -------------------------------------------------------------------------- */

export const getFeeAnalysis = cache(async (): Promise<FeeAnalysisResult> => {
  const positions = await getAnalysisPositions();
  return analyzeFees(positions);
});

export const getIncomeAnalysis = cache(async (): Promise<IncomeAnalysisResult> => {
  const positions = await getAnalysisPositions();
  return analyzeIncome(positions);
});

export const getSectorAnalysis = cache(async (): Promise<DiversificationResult> => {
  const positions = await getAnalysisPositions();
  return analyzeSectors(positions);
});

export const getRegionAnalysis = cache(async (): Promise<DiversificationResult> => {
  const positions = await getAnalysisPositions();
  return analyzeRegions(positions);
});

/**
 * Détails CSV complets des ETF, indexés par ISIN — passés au client pour le
 * panneau latéral de détail (frais, identifiants, répartitions, holdings).
 */
export function getEtfDetailsByIsin(): Record<string, EtfDetail> {
  const byIsin: Record<string, EtfDetail> = {};
  for (const detail of getAllEtfDetails()) {
    byIsin[detail.isin] = detail;
  }
  return byIsin;
}

/** Épargne mensuelle moyenne (12 mois glissants) depuis les versements réels. */
export const getAverageMonthlySavingsCents = cache(async (): Promise<number | null> => {
  const positions = await getAnalysisPositions();
  return averageMonthlySavings(positions);
});

/** Dépenses mensuelles estimées : salaire − épargne moyenne. */
export const getEstimatedMonthlyExpensesCents = cache(async (): Promise<number | null> => {
  const user = await prisma.user.findUnique({
    where: { id: await requireUserId() },
    select: { salaryCents: true },
  });
  const savings = await getAverageMonthlySavingsCents();
  return estimateMonthlyExpenses(user?.salaryCents ?? null, savings);
});
