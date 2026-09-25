import { cache } from "react";
import { prisma } from "./db";
import { requireUserId } from "./auth";
import { currentValueCents } from "@/lib/portfolio/series";
import { ETF_CATALOG, getEtfByIsin, getEtfByTicker } from "@/lib/etf-catalog";
import { fetchMarketHistory } from "@/lib/market/quotes";
import { isUSStock } from "@/lib/analysis/exposure-catalog";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import { getEtfDetailByIsin, getEtfDetailByTicker, getAllEtfDetails } from "@/lib/analysis/etf-detail";
import type { ActionDetail } from "@/lib/analysis/action-detail";
import { getAllActionDetails } from "@/lib/analysis/action-detail";
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
import { DEFAULT_EQUITY_RETURN } from "@/lib/analysis/scanners";
import {
  buildPerformanceReport,
  type PerformanceReport,
} from "@/lib/analysis/performance-report";
import {
  PERFORMANCE_PERIODS,
  type PerformancePeriodKey,
} from "@/lib/analysis/performance-periods";
import {
  mergeCashFlows,
  positionCashFlows,
  toUtcMidnight,
} from "@/lib/analysis/performance";
import { buildLivretBalanceSeries, LIVRET_A_RATE } from "@/lib/livret";

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
        symbol: position.symbol,
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
        valuations: position.valuations.map((v) => ({
          date: v.date,
          valueCents: v.valueCents,
        })),
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
  return analyzeRegions(positions, "zone");
});

/** Répartition géographique détaillée par pays (pays < 1 % regroupés). */
export const getCountryAnalysis = cache(async (): Promise<DiversificationResult> => {
  const positions = await getAnalysisPositions();
  return analyzeRegions(positions, "country");
});

/** Répartition par type d'économie MSCI (développée / émergente / frontière). */
export const getEconomyAnalysis = cache(async (): Promise<DiversificationResult> => {
  const positions = await getAnalysisPositions();
  return analyzeRegions(positions, "economy");
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

/**
 * Détails CSV des actions, indexés par symbole Yahoo ET par ISIN —
 * passés au client pour le panneau latéral de détail d'une action.
 */
export function getActionDetailsBySymbol(): Record<string, ActionDetail> {
  const bySymbol: Record<string, ActionDetail> = {};
  for (const detail of getAllActionDetails()) {
    bySymbol[detail.tickerYahoo.toUpperCase()] = detail;
    if (detail.isin) {
      bySymbol[detail.isin] = detail;
    }
  }
  return bySymbol;
}

/**
 * Croissance réelle du Monde sur une période, à partir d'un historique de
 * cours déjà récupéré (un seul appel Yahoo pour toutes les périodes).
 * Échec gracieux : null si l'historique ne couvre pas la période.
 */
function worldGrowthFromPoints(
  flows: { date: Date; amountCents: number }[],
  points: { date: Date; closeCents: number }[],
  periodStart: Date | null,
): PerformanceReport["worldGrowth"] {
  const startDate = periodStart ?? points[0]?.date ?? null;
  if (startDate === null) return null;
  const periodPoints = points.filter(
    (p) => p.date.getTime() >= startDate.getTime(),
  );
  if (periodPoints.length < 2) return null;
  const start = periodPoints[0];
  const end = periodPoints[periodPoints.length - 1];
  const cumulative = (end.closeCents - start.closeCents) / start.closeCents;
  const days = Math.round(
    (end.date.getTime() - start.date.getTime()) / (24 * 3600 * 1000),
  );
  const years = days / 365;
  const annualized =
    years > 1 && cumulative > -1
      ? Math.pow(1 + cumulative, 1 / years) - 1
      : null;
  // « marche d'escalier » DCA au cours réel du Monde : chaque versement
  // achète au cours du jour (premier cours ≥ sa date), la valeur finale est
  // la somme des parts au dernier cours — c'est CE qu'un ETF Monde simple
  // aurait réellement donné avec vos propres versements.
  let shares = 0;
  let cursor = 0;
  for (const point of periodPoints) {
    while (
      cursor < flows.length &&
      flows[cursor].date.getTime() <= point.date.getTime()
    ) {
      shares += flows[cursor].amountCents / point.closeCents;
      cursor += 1;
    }
  }
  // versements postérieurs au dernier cours disponible : au dernier cours
  while (cursor < flows.length) {
    shares += flows[cursor].amountCents / end.closeCents;
    cursor += 1;
  }
  const referenceValueCents = Math.round(shares * end.closeCents);
  return {
    cumulative,
    annualized,
    startDate: start.date,
    endDate: end.date,
    referenceValueCents,
    deltaCents: 0,
  };
}

/**
 * Rapport de performance (XIRR / TWR) pour chaque période du sélecteur
 * (1 an par défaut, 3 ans, 5 ans, toute la vie du portefeuille) : flux
 * externes de toutes les enveloppes (versements des positions + dépôts du
 * livret, qui n'est pas une position), valeur finale = patrimoine actuel.
 * Pour une sous-période, la valeur au cutoff vient des valorisations
 * historiques (dernière valorisation connue avant la date, 0 avant la
 * première). Trois niveaux de détail : global, par enveloppe, par actif.
 * Les flux sont normalisés à minuit UTC pour que chaque versement vive un
 * nombre entier de jours.
 */
export const getPerformanceReports = cache(
  async (): Promise<
    Record<PerformancePeriodKey, PerformanceReport | null>
  > => {
    const userId = await requireUserId();
    const positions = await getAnalysisPositions();
    const livretEnvelopes = await prisma.envelope.findMany({
      where: { userId, closedAt: null, type: "LIVRET_A" },
      include: { deposits: { orderBy: { date: "asc" } } },
    });
    const nowTime = Date.now();
    const now = new Date(nowTime);
    const livretFlows: { date: Date; amountCents: number }[] = [];
    const livretSeries: { date: Date; balanceCents: number }[][] = [];
    let livretBalance = 0;
    for (const env of livretEnvelopes) {
      const rate = env.interestRate ?? LIVRET_A_RATE;
      const events = env.deposits.map((dep) => ({
        date: dep.date,
        amountCents: dep.amountCents,
      }));
      const series = buildLivretBalanceSeries(events, rate);
      const current =
        [...series].reverse().find((p) => p.date.getTime() <= nowTime) ??
        series[0] ??
        null;
      livretBalance += current ? current.balanceCents : 0;
      livretSeries.push(series);
      livretFlows.push(...events);
    }
    // flux externes du portefeuille, triés et normalisés UTC minuit : c'est
    // la « marche d'escalier » DCA rejouée au cours réel du MSCI World
    const allFlows = mergeCashFlows([
      ...positions.flatMap((p) => positionCashFlows(p)),
      ...livretFlows.map((f) => ({
        date: toUtcMidnight(f.date),
        amountCents: f.amountCents,
      })),
    ]);
    if (allFlows.length === 0) {
      return { "1y": null, "3y": null, "5y": null, all: null };
    }
    const firstFlowDate = allFlows[0].date;
    const totalValue =
      positions.reduce((s, p) => s + p.valueCents, 0) + livretBalance;

    // un seul appel Yahoo pour toutes les périodes : l'historique complet
    // du premier flux à aujourd'hui
    const world = ETF_CATALOG.find((e) => e.indexCategory === "Monde");
    const worldHistory = world
      ? await fetchMarketHistory(world.isin, firstFlowDate, now).catch(
          () => null,
        )
      : null;
    const worldPoints =
      worldHistory && worldHistory.ok
        ? worldHistory.points.filter(
            (p) =>
              p.date.getTime() >= firstFlowDate.getTime() && p.closeCents > 0,
          )
        : [];

    const reports: Record<PerformancePeriodKey, PerformanceReport | null> = {
      "1y": null,
      "3y": null,
      "5y": null,
      all: null,
    };
    for (const { key, days } of PERFORMANCE_PERIODS) {
      // cutoff de la période ; « all » démarre au premier flux
      const periodStart =
        days === null
          ? null
          : toUtcMidnight(new Date(nowTime - days * 24 * 3600 * 1000));
      // période plus ancienne que le portefeuille : indisponible (null),
      // sauf « all » qui couvre toujours toute sa durée
      if (
        periodStart !== null &&
        periodStart.getTime() < firstFlowDate.getTime()
      ) {
        continue;
      }
      // solde du livret au cutoff : dernière quinzaine connue avant la date
      const livretStartValueCents = periodStart
        ? livretSeries.reduce((sum, series) => {
            const point =
              [...series]
                .reverse()
                .find((p) => p.date.getTime() <= periodStart.getTime()) ?? null;
            return sum + (point ? point.balanceCents : 0);
          }, 0)
        : 0;
      // croissance réelle du Monde sur la période, même historique de cours
      const periodWorldFlows = periodStart
        ? allFlows.filter((f) => f.date.getTime() > periodStart.getTime())
        : allFlows;
      const worldGrowth = worldGrowthFromPoints(
        periodWorldFlows,
        worldPoints,
        periodStart,
      );
      if (worldGrowth) {
        worldGrowth.deltaCents = totalValue - worldGrowth.referenceValueCents;
      }
      reports[key] = buildPerformanceReport({
        positions,
        livretFlows,
        livretValueCents: livretBalance,
        savingsRate: LIVRET_A_RATE,
        worldEquityRate: DEFAULT_EQUITY_RETURN,
        worldGrowth,
        period: key,
        periodStart,
        livretStartValueCents,
        now,
      });
    }
    return reports;
  },
);

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
