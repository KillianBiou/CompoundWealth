/**
 * Simulateur de patrimoine — module pur, utilisable côté client (aucun
 * import node:fs / serveur). La simulation à deux compartiments sépare
 * strictement l'investissement (actions/ETF, rendement composé) de
 * l'épargne (livret, rendement simple annualisé) : le DCA va toujours
 * à l'investissement, le reste des versements à l'épargne.
 */

/** Paramètres par défaut du simulateur, calculés côté serveur. */
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
