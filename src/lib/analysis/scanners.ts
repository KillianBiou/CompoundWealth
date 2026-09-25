import {
  COUNTRY_SHARE_THRESHOLD,
  getCountriesByIsin,
  getEtfExposureByIsin,
  getStockExposure,
  isUSStock,
  OTHER_COUNTRIES_LABEL,
  zoneOfCountry,
  type RegionKey,
  type Sector,
} from "./exposure-catalog";
import { getEtfDetailByIsin } from "./etf-detail";
import { getActionDetailBySymbol } from "./action-detail";

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
  /** ticker/symbole brut de la position (souvent l'ISIN après import) */
  symbol: string | null;
  /** enveloppe parente */
  envelopeId: string;
  envelopeName: string;
  envelopeType: "PEA" | "CTO" | "LIVRET_A" | "PRIV";
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
  /** ticker/symbole brut de la position (ISIN après import broker) */
  symbol: string | null;
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
  PRIV: 0,
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
      symbol: position.symbol,
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
  /** ticker/symbole brut de la position (ISIN après import broker) */
  symbol: string | null;
  envelopeName: string;
  /** cash perçu sur les 12 derniers mois glissants, centimes */
  twelveMonthsCents: number;
  /** estimation des 12 prochains mois, centimes */
  projectedCents: number;
  /** yield sur la valeur actuelle */
  yieldOnValue: number | null;
  /** mois de versement estimés (0 = janvier), issus de l'historique réel ; null si inconnu */
  paymentMonths: number[] | null;
  /** nombre de versements par an estimé */
  paymentsPerYear: number | null;
  /** prochain versement estimé (mois + montant) */
  nextPayment: { year: number; month: number; amountCents: number } | null;
}

/** position qui ne verse aucun dividende en cash — hors périmètre du scanner */
export interface ExcludedIncomeLine {
  positionId: string;
  name: string;
  isin: string | null;
  symbol: string | null;
  envelopeName: string;
  reason: "capitalizing" | "no_dividend";
}

export interface IncomeAnalysisResult {
  /** revenus cash perçus sur 12 mois glissants, centimes */
  cashTwelveMonthsCents: number;
  /** estimation des 12 prochains mois (cash uniquement), centimes */
  projectedTwelveMonthsCents: number;
  lines: IncomeLine[];
  /** positions ne versant aucun dividende en cash (ETF Acc, actions sans dividende) */
  excludedLines: ExcludedIncomeLine[];
  /** yield global pondéré = revenus estimés / valeur totale */
  yieldOnValue: number | null;
  /** versements estimés des 12 prochains mois (mois + montant), pour le calendrier */
  monthlyCalendar: { year: number; month: number; amountCents: number }[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function monthsAgo(now: Date, months: number): Date {
  return new Date(now.getFullYear(), now.getMonth() - months, 1);
}

/**
 * Versements trimestriels usuels des actions américaines payantes
 * (mars / juin / septembre / décembre) — calendrier par défaut quand aucun
 * historique réel n'est disponible.
 */
const US_STOCK_PAYMENT_MONTHS = [2, 5, 8, 11];

/**
 * Scanner de revenus passifs : seules les positions versant des dividendes
 * en cash sont listées — ETF distribuants (fichier de référence) et actions
 * payantes (rendement du fichier actions). Le cash perçu sur 12 mois
 * glissants est rapporté, les 12 prochains mois sont estimés avec leur
 * calendrier de versement. Les ETF capitalisants (Acc) et les valeurs sans
 * dividende sont explicitement exclus : leurs dividendes, s'ils existent,
 * sont réinvestis dans le cours, jamais versés en cash.
 */
export function analyzeIncome(
  positions: AnalysisPosition[],
  now: Date = new Date(),
): IncomeAnalysisResult {
  let cash12 = 0;
  let projected = 0;
  let totalValue = 0;
  const lines: IncomeLine[] = [];
  const excludedLines: ExcludedIncomeLine[] = [];
  const cutoff = monthsAgo(now, 12);

  for (const position of positions) {
    if (position.category === "LIVRET_A") continue;
    totalValue += position.valueCents;
    const cash = position.cashIncomeCents.filter((c) => c.date.getTime() >= cutoff.getTime());
    const cash12ForPosition = cash.reduce((s, c) => s + c.amountCents, 0);
    cash12 += cash12ForPosition;

    const etfDetail = position.isStock ? null : getEtfDetailByIsin(position.isin);
    const actionDetail = position.isStock
      ? getActionDetailBySymbol(position.isin ?? position.symbol ?? "")
      : null;
    const distributingEtf = etfDetail?.distributing ?? false;
    const dividendYield = position.isStock
      ? (actionDetail?.dividendYield ?? null)
      : distributingEtf
        ? (etfDetail?.dividendYield2025 ?? null)
        : null;
    const isPayer =
      cash12ForPosition > 0 ||
      (position.isStock && (dividendYield ?? 0) > 0) ||
      (!position.isStock && distributingEtf && dividendYield !== null);

    if (!isPayer) {
      excludedLines.push({
        positionId: position.id,
        name: position.name,
        isin: position.isin,
        symbol: position.symbol,
        envelopeName: position.envelopeName,
        reason: etfDetail && !etfDetail.distributing ? "capitalizing" : "no_dividend",
      });
      continue;
    }

    const projectedForPosition =
      dividendYield !== null && position.valueCents > 0
        ? Math.round(position.valueCents * dividendYield)
        : cash12ForPosition;
    projected += projectedForPosition;

    const historyMonths = [...new Set(position.cashIncomeCents.map((c) => c.date.getMonth()))].sort(
      (a, b) => a - b,
    );
    const defaultMonths =
      position.isStock && position.isin !== null && isUSStock(position.isin)
        ? US_STOCK_PAYMENT_MONTHS
        : null;
    const paymentMonths = historyMonths.length > 0 ? historyMonths : defaultMonths;
    const perPaymentCents =
      paymentMonths !== null ? Math.round(projectedForPosition / paymentMonths.length) : null;

    let nextPayment: IncomeLine["nextPayment"] = null;
    if (paymentMonths !== null && perPaymentCents !== null) {
      const upcoming = paymentMonths.find((m) => m >= now.getMonth());
      nextPayment =
        upcoming === undefined
          ? { year: now.getFullYear() + 1, month: paymentMonths[0], amountCents: perPaymentCents }
          : { year: now.getFullYear(), month: upcoming, amountCents: perPaymentCents };
    }

    lines.push({
      positionId: position.id,
      name: position.name,
      isin: position.isin,
      symbol: position.symbol,
      envelopeName: position.envelopeName,
      twelveMonthsCents: cash12ForPosition,
      projectedCents: projectedForPosition,
      yieldOnValue:
        position.valueCents > 0
          ? dividendYield !== null
            ? dividendYield
            : cash12ForPosition / position.valueCents
          : null,
      paymentMonths,
      paymentsPerYear: paymentMonths?.length ?? null,
      nextPayment,
    });
  }

  const nowMonth = now.getMonth();
  const calendar = new Map<string, { year: number; month: number; amountCents: number }>();
  for (const line of lines) {
    if (line.paymentMonths === null || line.projectedCents <= 0) continue;
    const perPayment = Math.round(line.projectedCents / line.paymentMonths.length);
    for (let offset = 0; offset < 12; offset += 1) {
      const month = (nowMonth + offset) % 12;
      if (!line.paymentMonths.includes(month)) continue;
      const year = now.getFullYear() + Math.floor((nowMonth + offset) / 12);
      const key = `${year}-${month}`;
      const entry = calendar.get(key) ?? { year, month, amountCents: 0 };
      entry.amountCents += perPayment;
      calendar.set(key, entry);
    }
  }
  const monthlyCalendar = [...calendar.values()].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );

  return {
    cashTwelveMonthsCents: cash12,
    projectedTwelveMonthsCents: projected,
    lines: lines.sort((a, b) => b.projectedCents - a.projectedCents),
    excludedLines,
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

/**
 * Scanner de diversification géographique — deux niveaux de granularité :
 * `zone` agrège les pays du fichier ETF en zones continentales (Amérique du
 * Nord, Amérique latine, Europe, Asie de l'Est, Asie émergente, Afrique &
 * Moyen-Orient, Océanie) ; `country` liste chaque pays représentant au moins
 * 1 % du portefeuille, le reste étant regroupé en « Autres pays ».
 */
export function analyzeRegions(
  positions: AnalysisPosition[],
  granularity: "zone" | "country" = "zone",
): DiversificationResult {
  if (granularity === "country") {
    const result = diversification(
      positions,
      (position) =>
        getCountriesByIsin(position.isin).map((c) => ({
          label: c.country,
          weight: c.weight,
          exposureCents: Math.round(position.valueCents * c.weight),
        })),
      GEO_ALERT_THRESHOLD,
    );
    return mergeSmallCountries(result);
  }
  return diversification(
    positions,
    (position) => {
      const countries = getCountriesByIsin(position.isin);
      const byZone = new Map<string, number>();
      for (const country of countries) {
        if (country.country === "Other") continue;
        const zone = zoneOfCountry(country.country) ?? "Other";
        byZone.set(zone, (byZone.get(zone) ?? 0) + country.weight);
      }
      return [...byZone.entries()].map(([zone, weight]) => ({
        label: zone,
        weight,
        exposureCents: Math.round(position.valueCents * weight),
      }));
    },
    GEO_ALERT_THRESHOLD,
  );
}

/**
 * Fusionne en « Autres pays » les lignes sous le seuil de 1 % et l'entrée
 * « Other » du fichier ETF (pays non détaillés par le fonds) : les petits
 * pays n'encombrent pas la vue détaillée, leurs contributions sont sommées
 * et leurs contributeurs conservés.
 */
function mergeSmallCountries(result: DiversificationResult): DiversificationResult {
  const isOther = (l: SectorBreakdownLine) =>
    l.sector === "Other" || l.sector === OTHER_COUNTRIES_LABEL;
  const kept = result.lines.filter((l) => !isOther(l) && l.share >= COUNTRY_SHARE_THRESHOLD);
  const small = result.lines.filter((l) => isOther(l) || l.share < COUNTRY_SHARE_THRESHOLD);
  if (small.length === 0) return result;
  const amountCents = small.reduce((s, l) => s + l.amountCents, 0);
  const contributorsMap = new Map<string, number>();
  for (const line of small) {
    for (const c of line.contributors) {
      contributorsMap.set(c.name, (contributorsMap.get(c.name) ?? 0) + c.amountCents);
    }
  }
  const otherLine: SectorBreakdownLine = {
    sector: OTHER_COUNTRIES_LABEL,
    amountCents,
    share: result.totalCents > 0 ? amountCents / result.totalCents : 0,
    contributors: [...contributorsMap.entries()].map(([name, amountCents]) => ({
      name,
      amountCents,
    })),
  };
  return {
    ...result,
    lines: [...kept, ...(amountCents > 0 ? [otherLine] : [])],
  };
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
export const DEFAULT_EQUITY_RETURN = 0.08;

/**
 * CAGR réel du portefeuille actions depuis les valuations, neutralisé des
 * versements : rendement pondéré par le temps (Modified Dietz par
 * sous-période, flux comptés à mi-période), annualisé. Diviser le gain net
 * par le seul capital initial gonflerait le rendement quand les versements
 * dominent (petit capital de départ + DCA mensuel). Retourne null si
 * l'historique est trop court (< 6 mois) ou trop petit.
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
  let chained = 1;
  let previousValue = start.valueCents;
  let previousInvested = valueAtOr(invested, start.date, 0);
  for (let i = 1; i < sorted.length; i += 1) {
    const point = sorted[i];
    const investedHere = valueAtOr(invested, point.date, previousInvested);
    const flow = investedHere - previousInvested;
    const denominator = previousValue + flow / 2;
    if (denominator > 0) {
      const periodReturn = (point.valueCents - previousValue - flow) / denominator;
      if (periodReturn > -1) {
        chained *= 1 + periodReturn;
      }
    }
    previousValue = point.valueCents;
    previousInvested = investedHere;
  }
  const totalReturn = chained - 1;
  if (totalReturn <= -1) return null;
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

export { simulateTwoTracks, type TwoTrackSimulationPoint } from "./simulator";
export type { SimulatorDefaults } from "./simulator";
import type { SimulatorDefaults } from "./simulator";

/**
 * Paramètres par défaut du simulateur : investissements actuels + DCA actif
 * + performance passée réelle si exploitable, sinon moyenne long terme
 * (actions ~8 %/an, livret à son taux contractuel).
 */
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
  /** solde actuel des livrets (centimes) — les dépôts de livret ne sont pas
   *  des positions, le solde vient de la série quinzaine de l'enveloppe */
  savingsWealthCents?: number;
  now?: Date;
}): SimulatorDefaults {
  const now = params.now ?? new Date();
  const investedWealthCents = params.positions
    .filter((p) => p.envelopeType !== "LIVRET_A" && p.valueCents > 0)
    .reduce((s, p) => s + p.valueCents, 0);
  const savingsWealthCents =
    params.savingsWealthCents ??
    params.positions
      .filter((p) => p.envelopeType === "LIVRET_A")
      .reduce((s, p) => s + p.valueCents, 0);
  // Défaut = DCA actif uniquement : les versements passés (achats historiques)
  // ne présagent pas d'une épargne mensuelle future.
  const monthlyDcaCents = params.dcaMonthlyCents;
  const monthlySavingsCents = params.dcaMonthlyCents;
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
