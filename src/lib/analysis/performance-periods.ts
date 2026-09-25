/* -------------------------------------------------------------------------- */
/*                     Périodes d'analyse de performance                      */
/* -------------------------------------------------------------------------- */

export type PerformancePeriodKey = "1y" | "3y" | "5y" | "all";

/**
 * Périodes proposées par le sélecteur : par défaut la dernière année, puis
 * 3 ans, 5 ans et toute la vie du portefeuille. `days` sert à calculer le
 * cutoff (null = premier flux du portefeuille).
 */
export const PERFORMANCE_PERIODS: readonly {
  key: PerformancePeriodKey;
  days: number | null;
}[] = [
  { key: "1y", days: 365 },
  { key: "3y", days: 1095 },
  { key: "5y", days: 1825 },
  { key: "all", days: null },
];

/**
 * Période affichée par défaut : la dernière année si le portefeuille est assez
 * âgé, sinon toute sa durée (la clé "all" est toujours construite côté serveur).
 */
export function defaultPerformancePeriod(
  reports: Record<PerformancePeriodKey, unknown | null>,
): PerformancePeriodKey {
  return reports["1y"] !== null ? "1y" : "all";
}
