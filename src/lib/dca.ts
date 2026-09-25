export type DcaFrequency = "BIWEEKLY" | "MONTHLY" | "BIMONTHLY" | "QUARTERLY";

export type EnvelopeType = "PEA" | "CTO" | "LIVRET_A" | "PRIV";

export const DCA_FREQUENCY_LABELS: Record<DcaFrequency, string> = {
  BIWEEKLY: "2 semaines",
  MONTHLY: "1 mois",
  BIMONTHLY: "2 mois",
  QUARTERLY: "3 mois",
};

export interface DcaPlanLike {
  frequency: DcaFrequency;
  startDate: Date;
  active: boolean;
}

export interface DcaLineLike {
  isin: string;
  maxAmountCents: number;
  active: boolean;
}

const MS_PER_DAY = 86_400_000;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, daysInMonth));
  result.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  return result;
}

export function advanceOccurrence(date: Date, frequency: DcaFrequency): Date {
  switch (frequency) {
    case "BIWEEKLY":
      return new Date(date.getTime() + 14 * MS_PER_DAY);
    case "MONTHLY":
      return addMonths(date, 1);
    case "BIMONTHLY":
      return addMonths(date, 2);
    case "QUARTERLY":
      return addMonths(date, 3);
  }
}

/** Prochaine occurrence >= from (ignorant l'heure : comparaison à la journée). */
export function nextOccurrence(
  plan: Pick<DcaPlanLike, "frequency" | "startDate">,
  from: Date = new Date(),
): Date {
  const fromDay = startOfDay(from);
  let occurrence = plan.startDate;
  let guard = 0;
  while (startOfDay(occurrence).getTime() < fromDay.getTime() && guard < 100_000) {
    occurrence = advanceOccurrence(occurrence, plan.frequency);
    guard += 1;
  }
  return occurrence;
}

/** Nombre d'occurrences du plan dans [windowStart, windowEnd] inclus. */
export function occurrencesIn(
  plan: Pick<DcaPlanLike, "frequency" | "startDate" | "active">,
  windowStart: Date,
  windowEnd: Date,
): number {
  if (!plan.active) return 0;
  const endDay = startOfDay(windowEnd);
  let count = 0;
  let occurrence = nextOccurrence(plan, windowStart);
  let guard = 0;
  while (startOfDay(occurrence).getTime() <= endDay.getTime() && guard < 100_000) {
    count += 1;
    occurrence = advanceOccurrence(occurrence, plan.frequency);
    guard += 1;
  }
  return count;
}

export interface SpendEstimate {
  /** montant réellement investissable estimé, en centimes */
  estimatedCents: number;
  /** parts achetables (entières pour un PEA) */
  quantity: number;
  /** reliquat non investi, en centimes */
  remainderCents: number;
}

/**
 * PEA : parts entières uniquement — sur 1 500 € avec une part à 120 €,
 * 12 parts = 1 440 € dépensés, 60 € non investis.
 * CTO : parts fractionnaires, tout le budget est dépensé.
 * Non coté (PRIV) : souscription en fractions de parts, tout le budget
 * est investi — pas de notion de part entière.
 */
export function estimateSpendCents(
  maxAmountCents: number,
  priceCents: number | null,
  envelopeType: EnvelopeType,
): SpendEstimate | null {
  if (priceCents === null || priceCents <= 0) return null;
  if (envelopeType !== "PEA") {
    return { estimatedCents: maxAmountCents, quantity: maxAmountCents / priceCents, remainderCents: 0 };
  }
  const quantity = Math.floor(maxAmountCents / priceCents);
  const estimatedCents = quantity * priceCents;
  return { estimatedCents, quantity, remainderCents: maxAmountCents - estimatedCents };
}

export interface DcaWindowSummary {
  windowStart: Date;
  windowEnd: Date;
  paymentsCount: number;
  totalMaxCents: number;
  totalEstimatedCents: number;
  /** au moins une ligne sans prix de référence connu */
  hasUnknownPrice: boolean;
}

export interface DcaPricedLine {
  plan: DcaPlanLike;
  line: DcaLineLike;
  priceCents: number | null;
}

/**
 * Agrégat d'une fenêtre : somme des versements des lignes actives,
 * montant max total et montant estimé (ajusté des parts entières).
 */
export function summarizeWindow(
  lines: DcaPricedLine[],
  envelopeType: EnvelopeType,
  windowStart: Date,
  windowEnd: Date,
): DcaWindowSummary {
  let paymentsCount = 0;
  let totalMaxCents = 0;
  let totalEstimatedCents = 0;
  let hasUnknownPrice = false;
  for (const entry of lines) {
    if (!entry.line.active || !entry.plan.active) continue;
    const payments = occurrencesIn(entry.plan, windowStart, windowEnd);
    if (payments === 0) continue;
    paymentsCount += payments;
    totalMaxCents += payments * entry.line.maxAmountCents;
    const estimate = estimateSpendCents(entry.line.maxAmountCents, entry.priceCents, envelopeType);
    if (estimate) {
      totalEstimatedCents += payments * estimate.estimatedCents;
    } else {
      hasUnknownPrice = true;
      totalEstimatedCents += payments * entry.line.maxAmountCents;
    }
  }
  return {
    windowStart,
    windowEnd,
    paymentsCount,
    totalMaxCents,
    totalEstimatedCents,
    hasUnknownPrice,
  };
}

export function addPeriod(from: Date, period: "1m" | "3m" | "1y"): Date {
  if (period === "1y") return addMonths(from, 12);
  return addMonths(from, period === "1m" ? 1 : 3);
}

/** Prochaines échéances 1 mois / 3 mois / 1 an (fenêtres glissantes depuis aujourd'hui). */
export function windowSummaries(
  lines: DcaPricedLine[],
  envelopeType: EnvelopeType,
  today: Date = new Date(),
): Record<"1m" | "3m" | "1y", DcaWindowSummary> {
  const start = startOfDay(today);
  const build = (period: "1m" | "3m" | "1y") =>
    summarizeWindow(lines, envelopeType, start, addPeriod(start, period));
  return { "1m": build("1m"), "3m": build("3m"), "1y": build("1y") };
}

/**
 * Prochaine date (>= aujourd'hui) tombant le jour du mois demandé.
 * Si le mois courant est trop court, le dernier jour du mois est retenu
 * (ex. le "31" tombe le 28/29 février).
 */
export function nextDateForDay(day: number, today: Date = new Date()): Date {
  const clamped = Math.max(1, Math.min(31, Math.floor(day)));
  const year = today.getFullYear();
  const daysInMonth = (m: number) => new Date(year, m + 1, 0).getDate();
  const candidate = (m: number) => {
    const dim = daysInMonth(m);
    return new Date(year, m, Math.min(clamped, dim));
  };
  for (let m = today.getMonth(); m < today.getMonth() + 2; m += 1) {
    const date = candidate(m);
    if (date.getTime() >= startOfDay(today).getTime()) return date;
  }
  return candidate(today.getMonth());
}
