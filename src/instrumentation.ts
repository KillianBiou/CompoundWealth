/**
 * Sync des métadonnées ETF depuis data/etfDetail.csv : le dossier data/ est
 * la source pilotable par l'utilisateur (ajout d'ETF, corrections de TER,
 * yields...). Le fichier est relu à chaque démarrage (le cache mémoire de
 * etf-detail.ts a un TTL court) et les positions existantes voient leur
 * ISIN résolu depuis leur ticker si le CSV apporte une correspondance plus
 * récente.
 *
 * Pour l'instant les métadonnées (TER, yield) sont lues à la volée depuis le
 * CSV ; ce hook garantit la relecture au démarrage en invalidant le cache.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { invalidateEtfDetailCache, getAllEtfDetails } = await import(
    "@/lib/analysis/etf-detail"
  );
  invalidateEtfDetailCache();
  const details = getAllEtfDetails();
  if (details.length > 0) {
    console.log(`[etf-detail] ${details.length} ETF chargés depuis data/etfDetail.csv`);
  }
}
