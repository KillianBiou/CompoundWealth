/* -------------------------------------------------------------------------- */
/*              Croissance réelle du MSCI World (marche DCA rejouée)          */
/* -------------------------------------------------------------------------- */

export interface WorldGrowthPoint {
  date: Date;
  closeCents: number;
}

export interface WorldGrowth {
  /** TWR du MSCI World sur la période (fraction) */
  cumulative: number;
  /** annualisé si période > 1 an, sinon null */
  annualized: number | null;
  /** premier point de cours utilisé */
  startDate: Date;
  /** dernier point de cours utilisé */
  endDate: Date;
  /** valeur finale théorique du capital de début + versements placés sur le
   *  MSCI World réel (la marche d'escalier DCA au cours réel du jour), centimes */
  referenceValueCents: number;
  /** écart du portefeuille réel vs cette marche d'escalier World réelle,
   *  centimes — rempli par buildPerformanceReport :
   *  valeur du portefeuille − referenceValueCents */
  deltaCents: number;
}

/**
 * Croissance réelle du Monde sur une période, à partir d'un historique de
 * cours déjà récupéré (un seul appel Yahoo pour toutes les périodes).
 * Échec gracieuse : null si l'historique ne couvre pas la période.
 *
 * Sur une sous-période, le capital déjà présent au cutoff
 * (startValueCents > 0) est « vendu » puis racheté en parts de World au cours
 * du cutoff — même périmètre que le XIRR de la sous-période, qui compte lui
 * aussi ce capital comme investi au cutoff. Sans ça, la référence ignorerait
 * la croissance World du capital initial et le verdict « 1y » contredirait
 * le verdict « all ».
 */
export function worldGrowthFromPoints(
  flows: { date: Date; amountCents: number }[],
  points: WorldGrowthPoint[],
  periodStart: Date | null,
  startValueCents = 0,
): WorldGrowth | null {
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
  // achète au cours du jour (premier cours ≥ sa date), le capital de début
  // achète au cours du cutoff, la valeur finale est la somme des parts au
  // dernier cours — c'est CE qu'un ETF Monde simple aurait réellement donné
  // avec le capital de départ et les propres versements de l'investisseur.
  const staircaseFlows =
    periodStart !== null && startValueCents > 0
      ? [
          { date: periodStart, amountCents: startValueCents },
          ...flows,
        ]
      : flows;
  let shares = 0;
  let cursor = 0;
  for (const point of periodPoints) {
    while (
      cursor < staircaseFlows.length &&
      staircaseFlows[cursor].date.getTime() <= point.date.getTime()
    ) {
      shares += staircaseFlows[cursor].amountCents / point.closeCents;
      cursor += 1;
    }
  }
  // versements postérieurs au dernier cours disponible : au dernier cours
  while (cursor < staircaseFlows.length) {
    shares += staircaseFlows[cursor].amountCents / end.closeCents;
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
