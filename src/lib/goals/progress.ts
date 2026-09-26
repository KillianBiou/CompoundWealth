/**
 * Buts (objectifs) — module pur de calcul de progression, partagé client/serveur.
 * Aucun import serveur ni Prisma ici : toutes les données d'entrée sont
 * passées en paramètres (centimes, dates explicites) pour la testabilité.
 *
 * Invariants de cohérence avec le reste de l'app :
 * - la valeur d'une enveloppe liée est TOUJOURS celle d'EnvelopeSummary
 *   (currentValueCents / solde livret quinzaine), jamais recalculée ici ;
 * - les montants restent en centimes entiers jusqu'à l'affichage ;
 * - le taux de retrait et le rendement attendu viennent des mêmes sources
 *   que le simulateur Analyse (une seule source de vérité).
 */

export type GoalType =
  | "SAFETY_NET"
  | "FIRE"
  | "RETIREMENT"
  | "DOWN_PAYMENT"
  | "CUSTOM_LIFEVENT"
  | "CUSTOM";

export type GoalStatus =
  | "onTrack"
  | "compromised"
  | "surplus"
  | "overfunded"
  | "achieved"
  | "underfunded"
  | "late"
  | "alert";

/** Rendement actions long terme attendu (moyenne prudente, cf. scanners). */
export const EXPECTED_EQUITY_RETURN = 0.062;
/** Marge de sécurité appliquée au rendement attendu pour le seuil "réaliste". */
export const REALISM_MARGIN = 0.02;
/** Seuil de réalisme par défaut : attendu − marge (but actions). */
export const REALISTIC_RETURN_THRESHOLD = EXPECTED_EQUITY_RETURN - REALISM_MARGIN;
/** Taux de retrait par défaut (règle des 4 %), identique au simulateur. */
export const DEFAULT_WITHDRAWAL_RATE = 0.04;
/** Durée de couverture par défaut du matelas (mois). */
export const DEFAULT_SAFETY_NET_MONTHS = 6;
/** Couverture minimale recommandée avant alerte (mois). */
export const SAFETY_NET_ALERT_MONTHS = 3;
/** Surplus net : couverture > cible × ce facteur → "trop élevé". */
export const SAFETY_NET_EXCESS_FACTOR = 1.5;
/** Progression ≥ 1,5 → surfinancé. */
export const OVERFUNDED_FACTOR = 1.5;
/** Projection > cible × 1,1 → excédentaire. */
export const SURPLUS_PROJECTION_FACTOR = 1.1;

/**
 * Échelle de précaution du matelas de sécurité — parlons couverture, pas
 * rendement : pour de l'épargne de précaution, la seule question est
 * « combien de temps mes dépenses sont-elles couvertes ».
 *
 * 1. "critical" : < 1 mois couvert — épargne très précaire ;
 * 2. "fragile"  : 1 à < 3 mois (zone d'alerte universelle du matelas) ;
 * 3. "partial"  : ≥ 3 mois mais < 50 % de la cible ;
 * 4. "building" : ≥ 50 % de la cible — plus de la moitié du chemin ;
 * 5. "robust"   : ≥ 100 % de la cible — réserve au complet ;
 * 6. "excess"   : > 150 % de la cible — liquidité dormante.
 *
 * Mode montant (pas de dépenses saisies) : les mois ne sont pas calculables,
 * l'échelle retombe sur la progression (10 % / 25 % / 50 % / 100 % / 150 %).
 */
export type SafetyNetLevel =
  | "critical"
  | "fragile"
  | "partial"
  | "building"
  | "robust"
  | "excess";

export function safetyNetLevel(
  monthsCovered: number | null,
  targetMonths: number | null,
  progress: number,
): SafetyNetLevel {
  if (monthsCovered !== null && targetMonths !== null && targetMonths > 0) {
    if (monthsCovered >= targetMonths * OVERFUNDED_FACTOR) return "excess";
    if (monthsCovered >= targetMonths) return "robust";
    if (monthsCovered / targetMonths >= 0.5) return "building";
    if (monthsCovered >= SAFETY_NET_ALERT_MONTHS) return "partial";
    if (monthsCovered >= 1) return "fragile";
    return "critical";
  }
  if (progress >= OVERFUNDED_FACTOR) return "excess";
  if (progress >= 1) return "robust";
  if (progress >= 0.5) return "building";
  if (progress >= 0.25) return "partial";
  if (progress >= 0.1) return "fragile";
  return "critical";
}

/** Buts dont la progression est un capital (rendement requis pertinent). */
export function isCapitalizedGoal(type: GoalType): boolean {
  return (
    type === "RETIREMENT" ||
    type === "DOWN_PAYMENT" ||
    type === "CUSTOM_LIFEVENT" ||
    type === "CUSTOM"
  );
}

export interface GoalMetricsInput {
  type: GoalType;
  /** valeur actuelle des enveloppes liées, centimes (source : EnvelopeSummary) */
  linkedValueCents: number;
  /** capital cible, centimes (RETIREMENT/DOWN_PAYMENT/CUSTOM_*) */
  targetAmountCents?: number | null;
  /** rente mensuelle cible, centimes (FIRE) */
  targetRentCents?: number | null;
  /** durée de couverture cible, mois (SAFETY_NET) */
  targetMonths?: number | null;
  /** dépenses mensuelles, centimes (SAFETY_NET) */
  monthlyExpensesCents?: number | null;
  /** taux de retrait, fraction (FIRE) */
  withdrawalRate?: number | null;
  /** contribution mensuelle déclarée, centimes */
  monthlyContributionCents?: number | null;
  /** date cible (tous sauf SAFETY_NET) */
  targetDate?: Date | null;
  /** date de création du but (origine de la trajectoire requise) */
  createdAt: Date;
  /** rendement que le portefeuille peut raisonnablement viser, fraction */
  expectedReturn?: number | null;
  /** rendement attendu si le but est 100 % liquide (livret), fraction */
  cashReturn?: number | null;
  now?: Date;
}

export interface GoalMetrics {
  /** progression brute : valeurLiée / cible (peut dépasser 1) */
  progress: number;
  /** progression affichée, clampée à [0, 1] */
  displayProgress: number;
  /** trajectoire théorique requise à la date d'observation, fraction */
  requiredTrajectory: number;
  /** mois de couverture actuels (SAFETY_NET) */
  monthsCovered: number | null;
  /** rente mensuelle actuelle, centimes (FIRE/RETIREMENT avec retrait) */
  currentRentCents: number | null;
  /** capital cible équivalent, centimes (FIRE) */
  capitalTargetCents: number | null;
  /** rendement annuel requis pour atteindre la cible à la date (capitalisés) */
  requiredReturn: number | null;
  /** rendement réaliste pour la composition du portefeuille */
  realisticReturn: number | null;
  /** épargne mensuelle nécessaire hors rendement, centimes */
  requiredMonthlySavingsCents: number | null;
  /** épargne mensuelle nécessaire au rendement attendu, centimes */
  requiredMonthlySavingsAtReturnCents: number | null;
  /**
   * Mois estimés pour remplir le but à la contribution mensuelle actuelle,
   * au rendement attendu (capitalisation mensuelle). Null si pas de cible,
   * pas de contribution ou inatteignable.
   */
  monthsToFill: number | null;
  status: GoalStatus;
}

const MS_PER_DAY = 86_400_000;

/** Mois entiers entre deux dates (approx 30,44 j/mois, comme historicalCagr). */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (30.44 * MS_PER_DAY);
}

/**
 * Rendement annuel requis r tel que :
 *   cible = valeur × (1+r)^n + contribution×12 × [((1+r)^n − 1)/r]
 * Résolution par bissection sur r ∈ [−0,05 ; 0,30] (50 itérations, 1e-6).
 * Sans contribution : solution fermée.
 * Retourne null si inatteignable par le rendement seul.
 */
export function requiredAnnualReturn(
  currentCents: number,
  targetCents: number,
  years: number,
  monthlyContributionCents: number | null | undefined,
): number | null {
  if (years <= 0 || targetCents <= 0) return null;
  const contribution = monthlyContributionCents ?? 0;

  const projectAt = (rate: number): number => {
    const growth = Math.pow(1 + rate, years);
    const fromCapital = currentCents * growth;
    if (rate === 0) return fromCapital + contribution * 12 * years;
    const annuity = contribution * 12 * ((growth - 1) / rate);
    return fromCapital + annuity;
  };

  if (contribution === 0) {
    if (currentCents <= 0) return null;
    return Math.pow(targetCents / currentCents, 1 / years) - 1;
  }

  if (projectAt(0) >= targetCents) {
    // atteignable sans rendement : le rendement requis est nul ou négatif ;
    // on borne la bissection au cas négatif
  }
  if (projectAt(0) === targetCents) return 0;

  let low = -0.05;
  let high = 0.3;
  if (projectAt(high) < targetCents) return null; // hors plage réaliste
  if (projectAt(low) > targetCents) {
    // atteignable même à −5 % : le rendement requis est ≤ −5 %
    return low;
  }
  for (let i = 0; i < 50; i += 1) {
    const mid = (low + high) / 2;
    if (projectAt(mid) < targetCents) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Niveau de faisabilité du but — grille de scénarios croisant le rendement
 * annuel requis, la moyenne long terme de la bourse (référence) et le
 * rendement passé réel des enveloppes liées :
 *
 * 1. "comfortable"        : requis nul (l'épargne seule suffit) ou ≤ moitié
 *    de la moyenne bourse → large marge, atteignable même avec un
 *    rendement médiocre ;
 * 2. "achievable"          : requis ≤ moyenne bourse (8 %) → atteignable au
 *    rythme moyen du marché ; sur un horizon court, sensible à un crash ;
 * 3. "achievableWithPast"  : requis > moyenne bourse mais couvert par le
 *    rendement passé des enveloppes → possible SI les performances passées
 *    se maintiennent (rien ne le garantit) — cas mitigé ;
 * 4. "demanding"           : requis > rendement passé mais ≤ 1,25 × ce passé
 *    → il faudrait battre durablement son propre historique ;
 * 5. "hard"                : requis au-delà du passé et ≤ 2 × la moyenne
 *    bourse → très difficile, même avec de bonnes enveloppes ;
 * 6. "extreme"             : au-delà de 2 × la moyenne bourse → quasiment
 *    impossible (ex. 25 % requis).
 *
 * Le passé indisponible (historique trop court) retombe sur la moyenne
 * bourse. L'avertissement « horizon court » est porté par
 * isShortHorizonConcern (sensibilité aux crashes si < 5 ans).
 */
export type GoalFeasibility =
  | "comfortable"
  | "achievable"
  | "achievableWithPast"
  | "demanding"
  | "hard"
  | "extreme";

export function goalFeasibility(
  requiredReturn: number | null,
  portfolioPastReturn: number | null,
  referenceReturn: number = EXPECTED_EQUITY_RETURN,
  unreachable: boolean = false,
): GoalFeasibility | null {
  // cible inatteignable même à 30 %/an avant l'échéance : le rendement
  // requis est hors de toute plage → pire niveau de la grille, jamais
  // « confortable » sous prétexte que la valeur est null
  if (unreachable) return "extreme";
  if (requiredReturn === null || requiredReturn <= 0) return "comfortable";
  if (referenceReturn <= 0) return null;
  if (requiredReturn <= referenceReturn * 0.5) return "comfortable";
  if (requiredReturn <= referenceReturn) return "achievable";
  if (
    portfolioPastReturn !== null &&
    portfolioPastReturn > 0 &&
    requiredReturn <= portfolioPastReturn
  ) {
    return "achievableWithPast";
  }
  if (
    portfolioPastReturn !== null &&
    portfolioPastReturn > 0 &&
    requiredReturn <= portfolioPastReturn * 1.25
  ) {
    return "demanding";
  }
  if (requiredReturn <= referenceReturn * 2) return "hard";
  return "extreme";
}

/**
 * Horizon considéré comme « court » pour l'avertissement de sensibilité aux
 * crashes : en dessous, la moyenne long terme n'a pas le temps de lisser
 * une mauvaise année.
 */
export const SHORT_HORIZON_YEARS = 5;

/** L'avertissement « horizon court » s'applique-t-il à ce niveau ? */
export function isShortHorizonConcern(
  feasibility: GoalFeasibility | null,
  yearsLeft: number | null | undefined,
): boolean {
  if (feasibility === null || yearsLeft === null || yearsLeft === undefined) {
    return false;
  }
  if (
    feasibility !== "achievable" &&
    feasibility !== "achievableWithPast" &&
    feasibility !== "demanding"
  ) {
    return false;
  }
  return yearsLeft < SHORT_HORIZON_YEARS;
}

/**
 * Épargne mensuelle nécessaire pour atteindre la cible à la date, au rendement
 * donné — inversion de la même formule que requiredAnnualReturn :
 *   cible = valeur×(1+r)^n + m×12×[((1+r)^n − 1)/r]  →  m
 */
export function requiredMonthlySavings(
  currentCents: number,
  targetCents: number,
  years: number,
  annualRate: number,
): number | null {
  if (years <= 0 || targetCents <= 0) return null;
  const growth = Math.pow(1 + annualRate, years);
  const fromCapital = currentCents * growth;
  const remaining = targetCents - fromCapital;
  if (remaining <= 0) return 0;
  if (annualRate === 0) return Math.ceil(remaining / (12 * years));
  const annuityFactor = 12 * ((growth - 1) / annualRate);
  return Math.ceil(remaining / annuityFactor);
}

/**
 * Trajectoire théorique requise : ligne droite de 0 (création du but) à 1
 * (date cible), clampée [0, 1]. Sans date cible, la trajectoire est 0
 * (pas d'échéance = pas de retard possible).
 */
export function requiredTrajectoryAt(
  createdAt: Date,
  targetDate: Date | null | undefined,
  now: Date,
): number {
  if (!targetDate) return 0;
  const totalMs = targetDate.getTime() - createdAt.getTime();
  if (totalMs <= 0) return 1;
  const elapsedMs = now.getTime() - createdAt.getTime();
  const ratio = elapsedMs / totalMs;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Projection du capital à la date cible au rendement donné, avec contribution
 * mensuelle — même mécanique que simulateTwoTracks (capitalisation mensuelle).
 */
export function projectCapital(
  currentCents: number,
  monthlyContributionCents: number,
  annualRate: number,
  years: number,
): number {
  if (years <= 0) return currentCents;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  let value = currentCents;
  const months = Math.round(years * 12);
  for (let m = 0; m < months; m += 1) {
    value = value * (1 + monthlyRate) + monthlyContributionCents;
  }
  return Math.round(value);
}

/** Vrai si le statut demande une attention (regroupement à revoir»). */
export function needsAttention(status: GoalStatus): boolean {
  return ["compromised", "underfunded", "late", "alert"].includes(status);
}

/** Ton sémantique du badge de statut — les tons existants de l'app. */
export function statusTone(
  status: GoalStatus,
): "positive" | "negative" | "warning" | "neutral" | "accent" | "gold" {
  switch (status) {
    case "achieved":
      return "gold";
    case "onTrack":
      return "positive";
    case "alert":
    case "late":
      return "negative";
    case "compromised":
    case "underfunded":
      return "warning";
    case "surplus":
      return "accent";
    case "overfunded":
      return "neutral";
  }
}

/**
 * Mois pour atteindre la cible à contribution fixe et rendement annuel donné
 * (capitalisation mensuelle, même mécanique que projectCapital).
 * Retourne null si inatteignable (> 600 mois) ou si déjà atteint (0).
 */
export function monthsToFillGoal(
  currentCents: number,
  targetCents: number,
  monthlyContributionCents: number,
  annualRate: number,
): number | null {
  if (targetCents <= 0 || currentCents >= targetCents) return 0;
  if (monthlyContributionCents <= 0 && annualRate <= 0) return null;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  let value = currentCents;
  for (let m = 1; m <= 600; m += 1) {
    value = value * (1 + monthlyRate) + monthlyContributionCents;
    if (value >= targetCents) return m;
  }
  return null;
}

/** Calcule toutes les métriques et le statut d'un but. */
export function computeGoalMetrics(input: GoalMetricsInput): GoalMetrics {
  const now = input.now ?? new Date();
  const {
    type,
    linkedValueCents,
    targetAmountCents,
    targetRentCents,
    targetMonths,
    monthlyExpensesCents,
    withdrawalRate,
    monthlyContributionCents,
    targetDate,
    createdAt,
  } = input;

  const contribution = monthlyContributionCents ?? 0;
  const yearsLeft = targetDate
    ? Math.max(0, monthsBetween(now, targetDate) / 12)
    : 0;
  const trajectory = requiredTrajectoryAt(createdAt, targetDate, now);

  if (type === "SAFETY_NET") {
    const months = targetMonths ?? DEFAULT_SAFETY_NET_MONTHS;
    const expenses = monthlyExpensesCents ?? 0;
    // mode réserve : cible = dépenses × mois ; mode montant : cible = montant direct
    const amountTarget =
      targetAmountCents !== null && targetAmountCents !== undefined && targetAmountCents > 0
        ? targetAmountCents
        : null;
    const reserveTarget = expenses > 0 ? Math.round(expenses * months) : null;
    const target = reserveTarget ?? amountTarget;
    const monthsCovered = expenses > 0 ? linkedValueCents / expenses : null;
    const progress = target !== null && target > 0 ? linkedValueCents / target : 0;
    let status: GoalStatus;
    if (progress >= OVERFUNDED_FACTOR) status = "overfunded";
    else if (progress >= 1) status = "achieved";
    else if (monthsCovered !== null && monthsCovered < SAFETY_NET_ALERT_MONTHS)
      status = "alert";
    else status = "onTrack";
    const cashReturn =
      input.cashReturn !== null && input.cashReturn !== undefined && input.cashReturn >= 0
        ? input.cashReturn
        : 0;
    return {
      progress,
      displayProgress: Math.min(1, Math.max(0, progress)),
      requiredTrajectory: trajectory,
      monthsCovered,
      currentRentCents: null,
      capitalTargetCents: target,
      requiredReturn: null,
      realisticReturn: null,
      requiredMonthlySavingsCents:
        target !== null
          ? Math.max(0, Math.ceil(target - linkedValueCents))
          : null,
      requiredMonthlySavingsAtReturnCents: null,
      monthsToFill:
        target !== null && target > linkedValueCents && contribution > 0
          ? monthsToFillGoal(linkedValueCents, target, contribution, cashReturn)
          : null,
      status,
    };
  }

  if (type === "FIRE") {
    const rate = withdrawalRate ?? DEFAULT_WITHDRAWAL_RATE;
    const currentRent = Math.round((linkedValueCents * rate) / 12);
    const capitalTarget =
      targetRentCents && targetRentCents > 0
        ? Math.round((targetRentCents * 12) / rate)
        : null;
    const progress =
      capitalTarget && capitalTarget > 0 ? linkedValueCents / capitalTarget : 0;
    const fireExpected = input.expectedReturn ?? null;
    // au rythme actuel (contribution + rendement attendu), le but sera-t-il
    // rempli AVANT la date cible ? Sinon « sur la bonne voie » serait faux.
    const projectedAtTarget =
      capitalTarget !== null &&
      targetDate &&
      targetDate.getTime() > now.getTime()
        ? projectCapital(
            linkedValueCents,
            contribution,
            fireExpected ?? 0,
            yearsLeft,
          )
        : null;
    const missedDeadline =
      projectedAtTarget !== null && capitalTarget !== null
        ? projectedAtTarget < capitalTarget
        : false;
    let status: GoalStatus;
    if (capitalTarget === null) status = "onTrack";
    else if (progress >= OVERFUNDED_FACTOR) status = "overfunded";
    else if (progress >= 1) status = "achieved";
    else if (missedDeadline) status = "late";
    else if (progress < trajectory) status = "underfunded";
    else status = "onTrack";
    if (targetDate && targetDate.getTime() < now.getTime() && progress < 1) {
      status = "late";
    }
    const fireRequiredReturn =
      capitalTarget !== null && capitalTarget > linkedValueCents
        ? requiredAnnualReturn(
            linkedValueCents,
            capitalTarget,
            targetDate ? yearsLeft : 0,
            contribution,
          )
        : null;
    return {
      progress,
      displayProgress: Math.min(1, Math.max(0, progress)),
      requiredTrajectory: trajectory,
      monthsCovered: null,
      currentRentCents: currentRent,
      capitalTargetCents: capitalTarget,
      requiredReturn: fireRequiredReturn,
      realisticReturn:
        fireExpected !== null ? Math.max(0, fireExpected - REALISM_MARGIN) : null,
      requiredMonthlySavingsCents:
        capitalTarget && capitalTarget > linkedValueCents
          ? Math.ceil(
              (capitalTarget - linkedValueCents) / Math.max(1, yearsLeft * 12),
            )
          : 0,
      requiredMonthlySavingsAtReturnCents: null,
      monthsToFill:
        capitalTarget !== null && capitalTarget > linkedValueCents && contribution > 0
          ? monthsToFillGoal(
              linkedValueCents,
              capitalTarget,
              contribution,
              fireExpected ?? 0,
            )
          : null,
      status,
    };
  }

  // buts capitalisés : RETIREMENT, DOWN_PAYMENT, CUSTOM_LIFEVENT, CUSTOM
  const target = targetAmountCents ?? 0;
  const expected =
    input.expectedReturn ??
    (input.cashReturn !== null && input.cashReturn !== undefined && input.cashReturn >= 0 && linkedValueCents >= 0 && type === "RETIREMENT"
      ? input.cashReturn
      : null);
  const realistic =
    expected !== null
      ? Math.max(0, expected - REALISM_MARGIN)
      : REALISTIC_RETURN_THRESHOLD;

  const progress = target > 0 ? linkedValueCents / target : 0;
  const requiredReturn = isCapitalizedGoal(type)
    ? requiredAnnualReturn(
        linkedValueCents,
        target,
        targetDate ? yearsLeft : 0,
        contribution,
      )
    : null;
  const requiredSavings =
    target > linkedValueCents
      ? Math.ceil((target - linkedValueCents) / Math.max(1, yearsLeft * 12))
      : 0;
  const requiredSavingsAtReturn =
    targetDate && targetDate.getTime() > now.getTime() && target > 0
      ? requiredMonthlySavings(
          linkedValueCents,
          target,
          yearsLeft,
          expected ?? 0,
        )
      : null;

  // projection au rendement réaliste (conservateur) : "surplus" signifie que
  // même l'hypothèse prudente dépasse la cible de plus de 10 % — un but dont
  // le rendement requis est atteignable n'est jamais "surplus" du seul fait
  // d'un rendement attendu optimiste
  const projected =
    targetDate && targetDate.getTime() > now.getTime() && target > 0
      ? projectCapital(linkedValueCents, contribution, realistic ?? 0, yearsLeft)
      : null;

  // même mécanique que FIRE : au rythme actuel (contribution + rendement
  // attendu), le but sera-t-il rempli à la date cible ? Sinon « en retard »
  // plutôt que « sur la bonne voie » — l'échéance engage, pas la trajectoire
  const projectedAtExpected =
    targetDate && targetDate.getTime() > now.getTime() && target > 0
      ? projectCapital(linkedValueCents, contribution, expected ?? 0, yearsLeft)
      : null;
  const missedDeadline =
    projectedAtExpected !== null ? projectedAtExpected < target : false;

  let status: GoalStatus;
  if (progress >= OVERFUNDED_FACTOR) status = "overfunded";
  else if (target > 0 && progress >= 1) status = "achieved";
  else if (targetDate && targetDate.getTime() < now.getTime() && progress < 1)
    status = "late";
  else if (missedDeadline && contribution + (expected ?? 0) > 0)
    status = "late";
  else if (
    isCapitalizedGoal(type) &&
    target > 0 &&
    yearsLeft > 0 &&
    requiredReturn === null
  )
    // inatteignable même à 30 %/an : le rendement requis dépasse tout ce qu'un
    // portefeuille peut viser
    status = "compromised";
  else if (
    requiredReturn !== null &&
    realistic !== null &&
    requiredReturn > realistic
  )
    status = "compromised";
  else if (progress < trajectory) status = "underfunded";
  else if (
    projected !== null &&
    target > 0 &&
    projected > target * SURPLUS_PROJECTION_FACTOR
  )
    status = "surplus";
  else status = "onTrack";
  if (target === 0) status = "onTrack";

  return {
    progress,
    displayProgress: Math.min(1, Math.max(0, progress)),
    requiredTrajectory: trajectory,
    monthsCovered: null,
    currentRentCents: null,
    capitalTargetCents: target > 0 ? target : null,
    requiredReturn,
    realisticReturn: realistic,
    requiredMonthlySavingsCents: requiredSavings,
    requiredMonthlySavingsAtReturnCents: requiredSavingsAtReturn,
    monthsToFill:
      target > linkedValueCents && contribution > 0
        ? monthsToFillGoal(linkedValueCents, target, contribution, expected ?? 0)
        : null,
    status,
  };
}

/**
 * Série mensuelle de la progression du but : échantillonnage au dernier jour
 * de chaque mois écoulé depuis le plus vieux point des séries liées (ou la
 * création du but si plus récente), interpolation plate via valueAt.
 * La métrique dépend du type : mois couverts (SAFETY_NET), rente mensuelle
 * (FIRE), sinon fraction de la cible.
 */
export interface GoalProgressPoint {
  date: Date;
  /** valeur agrégée des enveloppes liées, centimes */
  valueCents: number;
  /** métrique du but : mois de couverture, rente en centimes, ou fraction */
  metric: number;
}

export function buildGoalMonthlySeries(
  input: Omit<GoalMetricsInput, "linkedValueCents"> & {
    /** séries de valorisation agrégées des enveloppes liées (valueAt par date) */
    series: { date: Date; valueCents: number }[];
  },
): GoalProgressPoint[] {
  const { series } = input;
  if (series.length === 0) return [];
  const now = input.now ?? new Date();
  const sorted = [...series].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const start = sorted[0].date.getTime() < input.createdAt.getTime()
    ? sorted[0].date
    : input.createdAt;
  const points: GoalProgressPoint[] = [];
  const valueAtTime = (time: number): number => {
    let current = 0;
    for (const point of sorted) {
      if (point.date.getTime() <= time) current = point.valueCents;
      else break;
    }
    return current;
  };
  const metricFor = (valueCents: number): number => {
    const metrics = computeGoalMetrics({
      ...input,
      linkedValueCents: valueCents,
      now,
    });
    if (input.type === "SAFETY_NET")
      return metrics.monthsCovered !== null ? metrics.monthsCovered : metrics.progress;
    if (input.type === "FIRE") return metrics.currentRentCents ?? 0;
    return metrics.progress;
  };
  // dernier jour de chaque mois entre start et maintenant
  let cursor = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  let guard = 0;
  while (cursor.getTime() <= now.getTime() && guard < 1200) {
    guard += 1;
    const time = cursor.getTime();
    const value = valueAtTime(time);
    points.push({
      date: new Date(time),
      valueCents: value,
      metric: metricFor(value),
    });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
  }
  // point courant (valeur actuelle)
  const current = valueAtTime(now.getTime());
  if (
    points.length === 0 ||
    points[points.length - 1].date.getTime() < now.getTime()
  ) {
    points.push({
      date: new Date(now),
      valueCents: current,
      metric: metricFor(current),
    });
  }
  return points;
}
