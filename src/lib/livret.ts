export const LIVRET_A_DEPOSIT_CAP_CENTS = 2_295_000;
/** Taux en vigueur depuis le 1er août 2026 (révision semestrielle, Banque de France). */
export const LIVRET_A_RATE = 0.017;
/** Inflation usuelle utilisée comme préfill (cible BCE). */
export const LIVRET_A_DEFAULT_INFLATION = 0.02;
const FORTNIGHTS_PER_YEAR = 24;

export interface LivretEvent {
  date: Date;
  /** centimes ; positif = versement, négatif = retrait */
  amountCents: number;
}

export interface LivretPoint {
  date: Date;
  /** solde nominal, centimes (intérêts capitalisés au 31 décembre) */
  balanceCents: number;
  /** part du solde au-dessus du plafond, non rémunérée */
  overCapCents: number;
  /** cumul des versements nets (hors intérêts), centimes */
  depositedCents: number;
}

/** Début de la quinzaine suivant la date (un versement produit à partir de la quinzaine suivante). */
export function nextFortnightStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getDate() <= 15) return new Date(d.getFullYear(), d.getMonth(), 16);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** Quinzaine suivante : 1er → 16 du même mois, 16 → 1er du mois suivant. */
function addFortnight(d: Date): Date {
  if (d.getDate() === 1) return new Date(d.getFullYear(), d.getMonth(), 16);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/** Début de la quinzaine contenant la date. */
export function fortnightStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (d.getDate() <= 15) return new Date(d.getFullYear(), d.getMonth(), 1);
  return new Date(d.getFullYear(), d.getMonth(), 16);
}

/**
 * Solde du livret au fil du temps, quinzaine par quinzaine : chaque quinzaine
 * rapporte taux × solde / 24, crédité au solde le 31 décembre (capitalisation
 * annuelle). Le plafond de 22 950 € s'applique aux versements : la banque
 * refuserait un versement au-delà — l'excédent reste hors livret
 * (`overCapCents`, ≈ 0 %). Le solde crédité peut dépasser le plafond via les
 * intérêts capitalisés, et continue alors d'être rémunéré en totalité.
 */
export function buildLivretBalanceSeries(
  events: LivretEvent[],
  rate: number,
  now: Date = new Date(),
  horizonMonths = 12,
): LivretPoint[] {
  const sorted = [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length === 0) return [];
  const start = nextFortnightStart(sorted[0].date);
  const end = new Date(now.getFullYear(), now.getMonth() + horizonMonths + 1, 1);
  const points: LivretPoint[] = [];
  let balance = 0;
  let accruedInterest = 0;
  let deposited = 0;
  let overflow = 0;
  let eventIndex = 0;
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 10_000) {
    guard += 1;
    // versements/retraits dont la production d'intérêts a commencé
    while (
      eventIndex < sorted.length &&
      nextFortnightStart(sorted[eventIndex].date).getTime() <= cursor.getTime()
    ) {
      const amount = sorted[eventIndex].amountCents;
      deposited += amount;
      if (amount >= 0) {
        const allowed = Math.max(0, Math.min(amount, LIVRET_A_DEPOSIT_CAP_CENTS - balance));
        balance += allowed;
        overflow += amount - allowed;
      } else {
        const withdrawal = -amount;
        const fromOverflow = Math.min(overflow, withdrawal);
        overflow -= fromOverflow;
        const fromBalance = withdrawal - fromOverflow;
        balance = Math.max(0, balance - fromBalance);
      }
      eventIndex += 1;
    }
    // capitalisation annuelle : les intérêts de l'année passée sont crédités au 1er janvier
    if (points.length > 0 && cursor.getMonth() === 0 && cursor.getDate() === 1) {
      balance += Math.round(accruedInterest);
      accruedInterest = 0;
    }
    accruedInterest += (balance * rate) / FORTNIGHTS_PER_YEAR;
    points.push({
      date: new Date(cursor),
      balanceCents: balance,
      overCapCents: overflow,
      depositedCents: deposited,
    });
    cursor = addFortnight(cursor);
  }
  return points;
}

export interface LivretProjection {
  /** solde actuel (dernier point connu) */
  balanceCents: number;
  /** part au-dessus du plafond */
  overCapCents: number;
  /** intérêts attendus sur l'année à venir */
  interestCents: number;
  /** perte de valeur brute due à l'inflation seule, hors intérêts */
  inflationLossCents: number;
  /** solde projeté à horizon 1 an, en euros constants (pouvoir d'achat actuel) */
  realBalanceCents: number;
  /** variation réelle du pouvoir d'achat : négatif = perte */
  realChangeCents: number;
  /** taux de variation du pouvoir d'achat (négatif si perte) */
  realRate: number;
}

/**
 * Projection à 1 an : intérêts sur le solde au taux du livret (le solde
 * capitalisé peut dépasser le plafond et reste intégralement rémunéré), puis
 * conversion en euros constants via l'inflation — pour révéler la perte (ou le
 * gain) de pouvoir d'achat, et la perte de valeur brute due à l'inflation seule.
 */
export function projectOneYear(
  events: LivretEvent[],
  rate: number,
  inflation: number,
  now: Date = new Date(),
): LivretProjection | null {
  const series = buildLivretBalanceSeries(events, rate, now, 0);
  if (series.length === 0) return null;
  const nowFortnight = fortnightStart(now);
  const current =
    [...series].reverse().find((p) => p.date.getTime() <= nowFortnight.getTime()) ??
    series[series.length - 1];
  const interestCents = Math.round(current.balanceCents * rate);
  const nominalEnd = current.balanceCents + interestCents;
  const realBalance = Math.round(nominalEnd / (1 + inflation));
  const realChange = realBalance - current.balanceCents;
  const inflationLossCents = Math.round(current.balanceCents * (1 - 1 / (1 + inflation)));
  return {
    balanceCents: current.balanceCents,
    overCapCents: current.overCapCents,
    interestCents,
    inflationLossCents,
    realBalanceCents: realBalance,
    realChangeCents: realChange,
    realRate: current.balanceCents > 0 ? realChange / current.balanceCents : 0,
  };
}
