import {
  getEtfExposureByIsin,
  getStockExposure,
  type RegionKey,
  type Sector,
} from "./exposure-catalog";
import { getEtfDetailByIsin } from "./etf-detail";

/* -------------------------------------------------------------------------- */
/*                                                                            */
/*                        Position agrégée pour l'analyse                     */
/*                                                                            */
/* -------------------------------------------------------------------------- */

export interface AnalysisPosition {
  /** identifiant de la position */
  id: string;
  name: string;
  /** ISIN si connu (positions importées), sinon ticker/nom */
  isin: string | null;
  /** enveloppe parente */
  envelopeId: string;
  envelopeName: string;
  envelopeType: "PEA" | "CTO" | "LIVRET_A";
  category: string;
  /** valeur actuelle en centimes */
  valueCents: number;
  /** total investi en centimes */
  investedCents: number | null;
  /** TER en fraction (0.002 = 0,2 %/an) ; null si inconnu */
  ter: number | null;
  /** date du premier achat */
  boughtAt: Date;
  /** versements individuels, pour les frais de transaction et le DCA */
  investments: { date: Date; amountCents: number }[];
  /** versements de dividendes/intérêts reçus en cash, en centimes */
  cashIncomeCents: { date: Date; amountCents: number }[];
  /** nature du titre pour l'exposition */
  isStock: boolean;
}

export interface EnvelopeFee {
  envelopeName: string;
  /** coûts annuels totaux en centimes */
  annualCostCents: number;
}

export interface FeeLine {
  positionId: string;
  name: string;
  isin: string | null;
  envelopeName: string;
  ter: number | null;
  /** taux de frais d'enveloppe (custody), 0 pour PEA/CTO français standard */
  custodyRate: number;
  /** frais de transaction cumulés, centimes (issus des fees des achats) */
  transactionFeesCents: number;
  /** coût annuel = valeur × (TER + custody), centimes */
  annualCostCents: number;
  valueCents: number;
}

export interface FeeAnalysisResult {
  /** somme des coûts annuels, centimes */
  annualCostCents: number;
  /** taux de frais pondéré par la valeur, en fraction */
  feeRate: number | null;
  /** coût annuel par ligne */
  lines: FeeLine[];
  /** frais de transaction cumulés, centimes */
  transactionFeesCents: number;
  /** valeur totale analysée (hors épargne) */
  totalValueCents: number;
  /** manque à gagner projeté, en centimes, pour les horizons 10/20/30 ans */
  projectedLossCents: { horizonYears: number; lossCents: number }[];
  /** TER le plus élevé du portefeuille */
  worstTer: { name: string; ter: number } | null;
}

/** Custody fee : 0 pour PEA/CTO chez les courtiers français standards. */
export const CUSTODY_RATE_BY_ENVELOPE: Record<AnalysisPosition["envelopeType"], number> = {
  PEA: 0,
  CTO: 0,
  LIVRET_A: 0,
};

/** Rendement annuel moyen attendu des actions avant frais, pour les projections. */
export const EXPECTED_EQUITY_RETURN = 0.062;

/** Frais de référence pour la comparaison « avec tes frais » vs « frais bas ». */
export const LOW_FEE_REFERENCE = 0.0015;

/**
 * Scanner de frais : coût annuel de chaque ligne, taux pondéré, projection du
 * manque à gagner sur 10/20/30 ans (frais actuels vs référence LOW_FEE_REFERENCE).
 */
export function analyzeFees(positions: AnalysisPosition[]): FeeAnalysisResult {
  const lines: FeeLine[] = [];
  let totalAnnual = 0;
  let totalValue = 0;
  let totalTransactionFees = 0;
  let worstTer: { name: string; ter: number } | null = null;

  for (const position of positions) {
    if (position.category === "LIVRET_A" || position.valueCents <= 0) continue;
    const custodyRate = CUSTODY_RATE_BY_ENVELOPE[position.envelopeType];
    const ter = position.ter;
    const rate = (ter ?? 0) + custodyRate;
    const annualCost = Math.round(position.valueCents * rate);
    const transactionFees = position.investments.reduce((sum, inv) => {
      const rate = exposureTradingFeeRate(position);
      return sum + Math.round(inv.amountCents * rate);
    }, 0);
    totalTransactionFees += transactionFees;
    totalAnnual += annualCost;
    totalValue += position.valueCents;
    lines.push({
      positionId: position.id,
      name: position.name,
      isin: position.isin,
      envelopeName: position.envelopeName,
      ter,
      custodyRate,
      transactionFeesCents: transactionFees,
      annualCostCents: annualCost,
      valueCents: position.valueCents,
    });
    if (ter !== null && (!worstTer || ter > worstTer.ter)) {
      worstTer = { name: position.name, ter };
    }
  }

  const feeRate = totalValue > 0 ? totalAnnual / totalValue : null;
  const projectedLoss = [10, 20, 30].map((horizonYears) => {
    const excessRate = (feeRate ?? 0) - LOW_FEE_REFERENCE;
    if (excessRate <= 0 || totalValue <= 0) {
      return { horizonYears, lossCents: 0 };
    }
    // capital final différé : V×(1+r−f)^n vs V×(1+r−f_ref)^n
    const growth = Math.pow(1 + EXPECTED_EQUITY_RETURN - (feeRate ?? 0), horizonYears);
    const reference = Math.pow(1 + EXPECTED_EQUITY_RETURN - LOW_FEE_REFERENCE, horizonYears);
    return {
      horizonYears,
      lossCents: Math.round(totalValue * (reference - growth)),
    };
  });

  lines.sort((a, b) => b.annualCostCents - a.annualCostCents);
  return {
    annualCostCents: totalAnnual,
    feeRate,
    lines,
    transactionFeesCents: totalTransactionFees,
    totalValueCents: totalValue,
    projectedLossCents: projectedLoss,
    worstTer,
  };
}

function exposureTradingFeeRate(position: AnalysisPosition): number {
  const etf = getEtfExposureByIsin(position.isin);
  if (etf) return etf.tradingFeeRate;
  const stock = getStockExposure(position.isin);
  if (stock) return stock.tradingFeeRate;
  return 0;
}

/* -------------------------------------------------------------------------- */
/*                        Scanner de revenus passifs                          */
/* -------------------------------------------------------------------------- */

export interface IncomeLine {
  positionId: string;
  name: string;
  isin: string | null;
  envelopeName: string;
  /** type de revenu : cash (dividende versé) ou capitalisé (estimation) */
  kind: "cash" | "capitalized";
  /** montant 12 derniers mois en centimes */
  twelveMonthsCents: number;
  /** estimation 12 prochains mois, centimes */
  projectedCents: number;
  /** yield sur la valeur actuelle */
  yieldOnValue: number | null;
}

export interface IncomeAnalysisResult {
  /** revenus cash perçus sur 12 mois glissants, centimes */
  cashTwelveMonthsCents: number;
  /** estimation des 12 prochains mois (cash + capitalisés), centimes */
  projectedTwelveMonthsCents: number;
  /** dividendes capitalisés estimés sur 12 mois (ETF Acc), centimes */
  capitalizedTwelveMonthsCents: number;
  lines: IncomeLine[];
  /** yield global pondéré = revenus estimés / valeur totale */
  yieldOnValue: number | null;
  /** versements mensuels attendus (date du mois + montant), pour le calendrier */
  monthlyCalendar: { year: number; month: number; amountCents: number }[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function monthsAgo(now: Date, months: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - months, 1);
}

/**
 * Scanner de revenus passifs : cash reçu sur 12 mois glissants (dividendes,
 * intérêts) + estimation des 12 prochains mois (capitalisés inclus).
 */
export function analyzeIncome(
  positions: AnalysisPosition[],
  now: Date = new Date(),
): IncomeAnalysisResult {
  let cash12 = 0;
  let projected = 0;
  let capitalized = 0;
  let totalValue = 0;
  const lines: IncomeLine[] = [];
  const calendar = new Map<string, number>();
  const cutoff = monthsAgo(now, 12);

  for (const position of positions) {
    if (position.category === "LIVRET_A") continue;
    totalValue += position.valueCents;
    const cash = position.cashIncomeCents.filter((c) => c.date.getTime() >= cutoff.getTime());
    const cash12ForPosition = cash.reduce((s, c) => s + c.amountCents, 0);
    cash12 += cash12ForPosition;
    const detail = getEtfDetailByIsin(position.isin);
    const exposure =
      position.isStock
        ? getStockExposure(position.isin)
        : getEtfExposureByIsin(position.isin);
    const estimatedYield =
      detail?.dividendYield2025 !== null && detail?.dividendYield2025 !== undefined
        ? detail.dividendYield2025
        : (exposure?.dividendYield ?? 0);
    const capitalizedEstimate = Math.round(position.valueCents * estimatedYield);
    if (capitalizedEstimate > 0) {
      capitalized += capitalizedEstimate;
      lines.push({
        positionId: position.id,
        name: position.name,
        isin: position.isin,
        envelopeName: position.envelopeName,
        kind: "capitalized",
        twelveMonthsCents: cash12ForPosition,
        projectedCents: capitalizedEstimate,
        yieldOnValue: position.valueCents > 0 ? estimatedYield : null,
      });
    } else if (cash12ForPosition > 0) {
      lines.push({
        positionId: position.id,
        name: position.name,
        isin: position.isin,
        envelopeName: position.envelopeName,
        kind: "cash",
        twelveMonthsCents: cash12ForPosition,
        projectedCents: cash12ForPosition,
        yieldOnValue: position.valueCents > 0 ? cash12ForPosition / position.valueCents : null,
      });
    }
    projected += Math.max(capitalizedEstimate, cash12ForPosition);
  }

  for (const income of positions.flatMap((p) => p.cashIncomeCents)) {
    if (income.date.getTime() < cutoff.getTime()) continue;
    const key = `${income.date.getFullYear()}-${income.date.getMonth()}`;
    calendar.set(key, (calendar.get(key) ?? 0) + income.amountCents);
  }

  const monthlyCalendar = [...calendar.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amountCents]) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month, amountCents };
  });

  return {
    cashTwelveMonthsCents: cash12,
    projectedTwelveMonthsCents: projected,
    capitalizedTwelveMonthsCents: capitalized,
    lines: lines.sort((a, b) => b.projectedCents - a.projectedCents),
    yieldOnValue: totalValue > 0 ? projected / totalValue : null,
    monthlyCalendar,
  };
}

/* -------------------------------------------------------------------------- */
/*                    Scanners de diversification (secteur, géo)              */
/* -------------------------------------------------------------------------- */

export interface SectorBreakdownLine {
  sector: string;
  amountCents: number;
  share: number;
  /** contribution de chaque position à ce secteur */
  contributors: { name: string; amountCents: number }[];
}

export interface DiversificationResult {
  lines: SectorBreakdownLine[];
  /** score de 0 à 10 : pénalise la concentration (Herfindahl) et récompense le nombre de secteurs */
  score: number | null;
  /** parts supérieures au seuil d'alerte */
  alerts: { label: string; share: number; detail: string }[];
  totalCents: number;
}

const SECTOR_ALERT_THRESHOLD = 0.3;
const GEO_ALERT_THRESHOLD = 0.6;

function diversification(
  positions: AnalysisPosition[],
  keyOf: (position: AnalysisPosition) => { label: string; weight: number; exposureCents: number }[],
  alertThreshold: number,
): DiversificationResult {
  const byBucket = new Map<string, { amountCents: number; contributors: Map<string, number> }>();
  let total = 0;
  for (const position of positions) {
    if (position.category === "LIVRET_A" || position.valueCents <= 0) continue;
    const exposure = keyOf(position);
    if (exposure.length === 0) continue;
    total += position.valueCents;
    for (const slice of exposure) {
      const bucket = byBucket.get(slice.label) ?? {
        amountCents: 0,
        contributors: new Map<string, number>(),
      };
      bucket.amountCents += slice.exposureCents;
      bucket.contributors.set(
        position.name,
        (bucket.contributors.get(position.name) ?? 0) + slice.exposureCents,
      );
      byBucket.set(slice.label, bucket);
    }
  }
  if (total <= 0 || byBucket.size === 0) {
    return { lines: [], score: null, alerts: [], totalCents: 0 };
  }

  const lines = [...byBucket.entries()]
    .map(([label, bucket]) => {
      const share = bucket.amountCents / total;
      return {
        sector: label,
        amountCents: bucket.amountCents,
        share,
        contributors: [...bucket.contributors.entries()].map(([name, amountCents]) => ({
          name,
          amountCents,
        })),
      };
    })
    .sort((a, b) => b.amountCents - a.amountCents);

  const herfindahl = lines.reduce((sum, line) => sum + line.share * line.share, 0);
  const effectiveCount = lines.length;
  const concentrationPenalty = Math.max(0, herfindahl - 1 / Math.max(effectiveCount, 1));
  const score = Math.max(
    0,
    Math.min(10, Math.round((10 - concentrationPenalty * 8) * (effectiveCount >= 3 ? 1 : 0.5))),
  );

  const alerts = lines
    .filter((line) => line.share > alertThreshold)
    .map((line) => ({
      label: line.sector,
      share: line.share,
      detail: `${line.contributors
        .slice(0, 2)
        .map((c) => c.name)
        .join(" + ")}${line.contributors.length > 2 ? "…" : ""}`,
    }));

  return { lines, score, alerts, totalCents: total };
}

/** Répartition sectorielle réelle, ETF dépliés (look-through). */
export function analyzeSectors(positions: AnalysisPosition[]): DiversificationResult {
  return diversification(
    positions,
    (position) => {
      const exposure = position.isStock
        ? getStockExposure(position.isin)
        : getEtfExposureByIsin(position.isin);
      if (!exposure) return [];
      return exposure.sectors.map((s) => ({
        label: s.sector,
        weight: s.weight,
        exposureCents: Math.round(position.valueCents * s.weight),
      }));
    },
    SECTOR_ALERT_THRESHOLD,
  );
}

/** Répartition géographique réelle, ETF dépliés (look-through). */
export function analyzeRegions(positions: AnalysisPosition[]): DiversificationResult {
  return diversification(
    positions,
    (position) => {
      const exposure = position.isStock
        ? getStockExposure(position.isin)
        : getEtfExposureByIsin(position.isin);
      if (!exposure) return [];
      return exposure.regions.map((r) => ({
        label: r.region,
        weight: r.weight,
        exposureCents: Math.round(position.valueCents * r.weight),
      }));
    },
    GEO_ALERT_THRESHOLD,
  );
}

export type { RegionKey, Sector };

/* -------------------------------------------------------------------------- */
/*                            Simulateur de patrimoine                        */
/* -------------------------------------------------------------------------- */

export interface SimulationParams {
  /** patrimoine actuel, centimes */
  currentWealthCents: number;
  /** épargne mensuelle, centimes */
  monthlySavingsCents: number;
  /** rendement annuel attendu, fraction */
  annualReturn: number;
  /** inflation annuelle, fraction */
  inflation: number;
  /** horizon en années */
  horizonYears: number;
  /** taux de retrait annuel pour l'indépendance financière, fraction */
  withdrawalRate: number;
  /** dépenses mensuelles cibles, centimes (pour la règle 4 %) */
  monthlyExpensesCents: number;
}

export interface SimulationPoint {
  year: number;
  /** patrimoine nominal, centimes */
  nominalCents: number;
  /** patrimoine en euros constants de today, centimes */
  realCents: number;
}

export interface SimulationResult {
  points: SimulationPoint[];
  /** date (année) où le capital atteint 25× les dépenses annuelles, si trouvé */
  fireYear: number | null;
  /** jalons : capital cible → année d'atteinte */
  milestones: { label: string; targetCents: number; year: number | null }[];
  /** capital final nominal, centimes */
  finalNominalCents: number;
  /** capital final en euros constants, centimes */
  finalRealCents: number;
  /** table de sensibilité : capital final selon rendement × épargne mensuelle */
  sensitivity: { annualReturn: number; monthlySavingsCents: number; finalCents: number }[];
}

export function simulateWealth(params: SimulationParams): SimulationResult {
  const {
    currentWealthCents,
    monthlySavingsCents,
    annualReturn,
    inflation,
    horizonYears,
    withdrawalRate,
    monthlyExpensesCents,
  } = params;
  const points: SimulationPoint[] = [];
  let balance = currentWealthCents;
  let fireYear: number | null = null;
  const startYear = new Date().getFullYear();
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const fireTargetCents = monthlyExpensesCents * 12 * (1 / Math.max(withdrawalRate, 0.0001));
  const milestones = [
    { label: "100 k€", targetCents: 10_000_000 },
    { label: "250 k€", targetCents: 25_000_000 },
    { label: "500 k€", targetCents: 50_000_000 },
    { label: "1 M€", targetCents: 100_000_000 },
  ].map((m) => ({ ...m, year: null as number | null }));
  const milestonePending = new Set(milestones.map((_, i) => i));

  points.push({ year: startYear, nominalCents: balance, realCents: balance });
  if (fireTargetCents > 0 && balance >= fireTargetCents) {
    fireYear = startYear;
  }
  for (let year = 1; year <= horizonYears; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      balance = balance * (1 + monthlyRate) + monthlySavingsCents;
    }
    const real = balance / Math.pow(1 + inflation, year);
    const point = { year: startYear + year, nominalCents: Math.round(balance), realCents: Math.round(real) };
    points.push(point);
    if (fireYear === null && fireTargetCents > 0 && balance >= fireTargetCents) {
      fireYear = point.year;
    }
    for (const index of milestonePending) {
      const milestone = milestones[index];
      if (balance >= milestone.targetCents) {
        milestone.year = point.year;
        milestonePending.delete(index);
      }
    }
  }

  const returns = [0.03, 0.05, 0.08];
  const savingsOptions = [
    Math.round(monthlySavingsCents * 0.5),
    monthlySavingsCents,
    Math.round(monthlySavingsCents * 1.5),
  ];
  const sensitivity = returns.flatMap((r) =>
    savingsOptions.map((s) => ({
      annualReturn: r,
      monthlySavingsCents: s,
      finalCents: projectFinalCents(currentWealthCents, s, r, horizonYears),
    })),
  );

  return {
    points,
    fireYear,
    milestones,
    finalNominalCents: Math.round(balance),
    finalRealCents: Math.round(balance / Math.pow(1 + inflation, horizonYears)),
    sensitivity,
  };
}

function projectFinalCents(
  currentWealthCents: number,
  monthlySavingsCents: number,
  annualReturn: number,
  horizonYears: number,
): number {
  let balance = currentWealthCents;
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;
  for (let month = 1; month <= horizonYears * 12; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlySavingsCents;
  }
  return Math.round(balance);
}

/** Épargne mensuelle moyenne sur les 12 derniers mois, issue des versements réels. */
export function averageMonthlySavings(
  positions: AnalysisPosition[],
  now: Date = new Date(),
): number | null {
  const cutoff = new Date(now.getTime() - 365 * MS_PER_DAY);
  const total = positions
    .flatMap((p) => p.investments)
    .filter((inv) => inv.date.getTime() >= cutoff.getTime())
    .reduce((s, inv) => s + inv.amountCents, 0);
  const investedCount = positions.some((p) => p.investments.length > 0);
  if (!investedCount) return null;
  return Math.round(total / 12);
}

/** Dépenses mensuelles moyennes estimées : salaire × 1 − taux d'épargne observé. */
export function estimateMonthlyExpenses(
  salaryCents: number | null,
  averageMonthlySavingsCents: number | null,
): number | null {
  if (salaryCents === null || salaryCents <= 0) return null;
  if (averageMonthlySavingsCents === null) return salaryCents * 0.8;
  return Math.max(0, salaryCents - averageMonthlySavingsCents);
}

/* -------------------------------------------------------------------------- */
/*                 Performance passée et paramètres par défaut                 */
/* -------------------------------------------------------------------------- */

/** Rendement actions long terme par défaut quand l'historique est insuffisant. */
export const DEFAULT_EQUITY_RETURN = 0.07;

/**
 * CAGR réel du portefeuille actions depuis les valuations : part de la
 * performance qui n'est pas expliquée par les versements. On neutralise les
 * flux : rendement = (V_fin − Σ versements postérieurs au début) / V_début,
 * annualisé. Retourne null si l'historique est trop court (< 6 mois) ou
 * trop petit.
 */
export function historicalCagr(
  valuations: { date: Date; valueCents: number }[],
  invested: { date: Date; valueCents: number }[],
  now: Date = new Date(),
): number | null {
  if (valuations.length < 2) return null;
  const sorted = [...valuations].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sorted[0];
  const months = (now.getTime() - start.date.getTime()) / (30.44 * 24 * 3600 * 1000);
  if (months < 6 || start.valueCents <= 0) return null;
  const end = sorted[sorted.length - 1];
  // approche flux nettoyés : gain réel = V_end − V_start − versements sur la période
  const investedStart = valueAtOr(invested, start.date, 0);
  const investedEnd = valueAtOr(invested, now, 0);
  const flows = investedEnd - investedStart;
  const realGain = end.valueCents - start.valueCents - flows;
  if (start.valueCents <= 0) return null;
  const totalReturn = realGain / start.valueCents;
  const years = Math.max(months / 12, 0.5);
  const cagr = Math.pow(1 + totalReturn, 1 / years) - 1;
  if (!Number.isFinite(cagr)) return null;
  return Math.max(-0.5, Math.min(0.25, cagr));
}

function valueAtOr(
  points: { date: Date; valueCents: number }[],
  date: Date,
  fallback: number,
): number {
  let current = fallback;
  for (const p of points) {
    if (p.date.getTime() <= date.getTime()) current = p.valueCents;
    else break;
  }
  return current;
}

/**
 * Paramètres par défaut du simulateur : investissements actuels + DCA actif
 * + performance passée réelle si exploitable, sinon moyenne long terme
 * (actions ~7 %/an, livret à son taux contractuel).
 */
export interface SimulatorDefaults {
  /** patrimoine investi (actions/ETF) actuel, centimes */
  investedWealthCents: number;
  /** épargne réglementée (livrets) actuelle, centimes */
  savingsWealthCents: number;
  /** épargne mensuelle totale (versements réels + DCA actif estimé), centimes */
  monthlySavingsCents: number;
  /** part investie (DCA) de l'épargne mensuelle, centimes */
  monthlyDcaCents: number;
  /** rendement annuel des investissements, fraction */
  equityReturn: number;
  /** rendement annuel de l'épargne (livret), fraction */
  savingsReturn: number;
  /** source du rendement actions : historique réel ou moyenne long terme */
  returnSource: "historique" | "moyenne";
}

export function buildSimulatorDefaults(params: {
  positions: AnalysisPosition[];
  /** valuations patrimoine investi (actions) agrégées */
  equityValuations: { date: Date; valueCents: number }[];
  /** cumul investi agrégé (actions) */
  equityInvested: { date: Date; valueCents: number }[];
  /** DCA actif : total mensuel estimé en centimes (toutes enveloppes actions) */
  dcaMonthlyCents: number;
  /** taux du livret (fraction), pour l'épargne */
  savingsRate: number;
  now?: Date;
}): SimulatorDefaults {
  const now = params.now ?? new Date();
  const investedWealthCents = params.positions
    .filter((p) => p.envelopeType !== "LIVRET_A" && p.valueCents > 0)
    .reduce((s, p) => s + p.valueCents, 0);
  const savingsWealthCents = params.positions
    .filter((p) => p.envelopeType === "LIVRET_A")
    .reduce((s, p) => s + p.valueCents, 0);
  const realSavingsMonthly = averageMonthlySavings(params.positions, now) ?? 0;
  const monthlySavingsCents = realSavingsMonthly + params.dcaMonthlyCents;
  const monthlyDcaCents = params.dcaMonthlyCents;
  const cagr = historicalCagr(params.equityValuations, params.equityInvested, now);
  return {
    investedWealthCents,
    savingsWealthCents,
    monthlySavingsCents,
    monthlyDcaCents,
    equityReturn: cagr ?? DEFAULT_EQUITY_RETURN,
    savingsReturn: params.savingsRate,
    returnSource: cagr !== null ? "historique" : "moyenne",
  };
}

/**
 * Simulation à deux compartiments : investissement (actions, rendement
 * composé) et épargne (livret, rendement simple annualisé). L'épargne
 * mensuelle est répartie selon la part DCA : le DCA va à l'investissement,
 * le reste à l'épargne — jamais l'inverse.
 */
export interface TwoTrackSimulationPoint {
  year: number;
  investedCents: number;
  savingsCents: number;
  totalCents: number;
  totalRealCents: number;
}

export function simulateTwoTracks(params: {
  investedWealthCents: number;
  savingsWealthCents: number;
  monthlyInvestedCents: number;
  monthlySavingsCents: number;
  equityReturn: number;
  savingsReturn: number;
  inflation: number;
  horizonYears: number;
}): { points: TwoTrackSimulationPoint[]; fireYear: number | null } {
  const {
    investedWealthCents,
    savingsWealthCents,
    monthlyInvestedCents,
    monthlySavingsCents,
    equityReturn,
    savingsReturn,
    inflation,
    horizonYears,
  } = params;
  const equityMonthly = Math.pow(1 + equityReturn, 1 / 12) - 1;
  const savingsMonthly = savingsReturn / 12;
  let invested = investedWealthCents;
  let savings = savingsWealthCents;
  const startYear = new Date().getFullYear();
  const points: TwoTrackSimulationPoint[] = [
    {
      year: startYear,
      investedCents: Math.round(invested),
      savingsCents: Math.round(savings),
      totalCents: Math.round(invested + savings),
      totalRealCents: Math.round(invested + savings),
    },
  ];

  for (let year = 1; year <= horizonYears; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      invested = invested * (1 + equityMonthly) + monthlyInvestedCents;
      savings = savings * (1 + savingsMonthly) + monthlySavingsCents;
    }
    const total = invested + savings;
    points.push({
      year: startYear + year,
      investedCents: Math.round(invested),
      savingsCents: Math.round(savings),
      totalCents: Math.round(total),
      totalRealCents: Math.round(total / Math.pow(1 + inflation, year)),
    });
  }
  return { points, fireYear: null };
}
