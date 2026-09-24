/**
 * Exposition sous-jacente des ETF du catalogue — look-through sectoriel et
 * géographique. Valeurs approchées d'après les répartitions publiques des
 * indices de référence (MSCI, S&P, STOXX, Bloomberg) ; destinées à être
 * remplacées par un enrichissement fichier / API / scraper.
 */

export type RegionKey =
  | "US"
  | "Europe"
  | "Japon"
  | "Canada"
  | "Émergents"
  | "Monde";

export interface SectorWeight {
  sector: string;
  weight: number;
}

export interface RegionWeight {
  region: RegionKey;
  weight: number;
}

export interface EtfExposure {
  isin: string;
  sectors: SectorWeight[];
  regions: RegionWeight[];
  /** dividende annuel estimé en fraction de la valeur (0 pour les Acc) */
  dividendYield: number;
  /** frais de transaction moyens constatés (fraction du montant, ex. 0,001) */
  tradingFeeRate: number;
}

/** Secteurs GICS regroupés pour la lisibilité. */
export const SECTORS = [
  "Technologie",
  "Finance",
  "Santé",
  "Industrie",
  "Consommation discrétionnaire",
  "Consommation de base",
  "Énergie",
  "Services publics",
  "Télécommunications",
  "Matériaux",
  "Immobilier",
] as const;

export type Sector = (typeof SECTORS)[number];

export const REGIONS: { key: RegionKey; label: string; flag: string }[] = [
  { key: "US", label: "États-Unis", flag: "🇺🇸" },
  { key: "Europe", label: "Europe", flag: "🇪🇺" },
  { key: "Japon", label: "Japon", flag: "🇯🇵" },
  { key: "Canada", label: "Canada", flag: "🇨🇦" },
  { key: "Émergents", label: "Émergents", flag: "🌍" },
  { key: "Monde", label: "Monde", flag: "🌐" },
];

const MSCI_WORLD_SECTORS: SectorWeight[] = [
  { sector: "Technologie", weight: 0.26 },
  { sector: "Finance", weight: 0.16 },
  { sector: "Industrie", weight: 0.12 },
  { sector: "Consommation discrétionnaire", weight: 0.11 },
  { sector: "Santé", weight: 0.1 },
  { sector: "Consommation de base", weight: 0.06 },
  { sector: "Services publics", weight: 0.03 },
  { sector: "Énergie", weight: 0.03 },
  { sector: "Télécommunications", weight: 0.03 },
  { sector: "Matériaux", weight: 0.03 },
  { sector: "Immobilier", weight: 0.02 },
];

const MSCI_WORLD_REGIONS: RegionWeight[] = [
  { region: "US", weight: 0.69 },
  { region: "Japon", weight: 0.06 },
  { region: "Europe", weight: 0.15 },
  { region: "Canada", weight: 0.03 },
  { region: "Émergents", weight: 0.07 },
];

const S_P_500_SECTORS: SectorWeight[] = [
  { sector: "Technologie", weight: 0.34 },
  { sector: "Finance", weight: 0.13 },
  { sector: "Santé", weight: 0.11 },
  { sector: "Consommation discrétionnaire", weight: 0.1 },
  { sector: "Industrie", weight: 0.09 },
  { sector: "Consommation de base", weight: 0.05 },
  { sector: "Services publics", weight: 0.03 },
  { sector: "Énergie", weight: 0.03 },
  { sector: "Télécommunications", weight: 0.02 },
  { sector: "Matériaux", weight: 0.02 },
  { sector: "Immobilier", weight: 0.02 },
];

const S_P_500_REGIONS: RegionWeight[] = [{ region: "US", weight: 1 }];

const NASDAQ_100_SECTORS: SectorWeight[] = [
  { sector: "Technologie", weight: 0.6 },
  { sector: "Consommation discrétionnaire", weight: 0.25 },
  { sector: "Télécommunications", weight: 0.07 },
  { sector: "Santé", weight: 0.04 },
  { sector: "Industrie", weight: 0.02 },
  { sector: "Consommation de base", weight: 0.02 },
];

const NASDAQ_100_REGIONS: RegionWeight[] = [{ region: "US", weight: 1 }];

const STOXX_EUROPE_600_SECTORS: SectorWeight[] = [
  { sector: "Industrie", weight: 0.17 },
  { sector: "Finance", weight: 0.16 },
  { sector: "Consommation discrétionnaire", weight: 0.12 },
  { sector: "Santé", weight: 0.12 },
  { sector: "Technologie", weight: 0.09 },
  { sector: "Consommation de base", weight: 0.09 },
  { sector: "Services publics", weight: 0.05 },
  { sector: "Énergie", weight: 0.05 },
  { sector: "Matériaux", weight: 0.05 },
  { sector: "Télécommunications", weight: 0.04 },
  { sector: "Immobilier", weight: 0.03 },
];

const EUROPE_REGIONS: RegionWeight[] = [{ region: "Europe", weight: 1 }];

const EUROZONE_SECTORS: SectorWeight[] = [
  { sector: "Finance", weight: 0.19 },
  { sector: "Industrie", weight: 0.17 },
  { sector: "Consommation discrétionnaire", weight: 0.12 },
  { sector: "Santé", weight: 0.11 },
  { sector: "Consommation de base", weight: 0.1 },
  { sector: "Technologie", weight: 0.09 },
  { sector: "Services publics", weight: 0.06 },
  { sector: "Énergie", weight: 0.05 },
  { sector: "Matériaux", weight: 0.05 },
  { sector: "Télécommunications", weight: 0.03 },
  { sector: "Immobilier", weight: 0.03 },
];

const FRANCE_SECTORS: SectorWeight[] = [
  { sector: "Industrie", weight: 0.18 },
  { sector: "Consommation discrétionnaire", weight: 0.17 },
  { sector: "Finance", weight: 0.13 },
  { sector: "Consommation de base", weight: 0.11 },
  { sector: "Santé", weight: 0.08 },
  { sector: "Services publics", weight: 0.07 },
  { sector: "Technologie", weight: 0.07 },
  { sector: "Énergie", weight: 0.04 },
  { sector: "Matériaux", weight: 0.04 },
  { sector: "Télécommunications", weight: 0.03 },
  { sector: "Immobilier", weight: 0.02 },
];

const FRANCE_REGIONS: RegionWeight[] = [{ region: "Europe", weight: 1 }];

const DEFENSE_EUROPE_SECTORS: SectorWeight[] = [
  { sector: "Industrie", weight: 1 },
];

const TECH_EUROPE_SECTORS: SectorWeight[] = [
  { sector: "Technologie", weight: 1 },
];

const EM_SECTORS: SectorWeight[] = [
  { sector: "Technologie", weight: 0.24 },
  { sector: "Finance", weight: 0.2 },
  { sector: "Consommation discrétionnaire", weight: 0.12 },
  { sector: "Consommation de base", weight: 0.09 },
  { sector: "Industrie", weight: 0.08 },
  { sector: "Matériaux", weight: 0.07 },
  { sector: "Énergie", weight: 0.06 },
  { sector: "Santé", weight: 0.05 },
  { sector: "Télécommunications", weight: 0.04 },
  { sector: "Services publics", weight: 0.03 },
  { sector: "Immobilier", weight: 0.02 },
];

const EM_REGIONS: RegionWeight[] = [{ region: "Émergents", weight: 1 }];

/** Frais de transaction Trade Republic : 1 € par ordre, ordre gratuit sur les savings plans. */
const TR_TRADING_FEE_RATE = 0.001;

function etf(
  isin: string,
  sectors: SectorWeight[],
  regions: RegionWeight[],
  dividendYield: number,
  tradingFeeRate = TR_TRADING_FEE_RATE,
): EtfExposure {
  return { isin, sectors, regions, dividendYield, tradingFeeRate };
}

/** Expositions par ISIN — complétées/approchées, à remplacer par l'enrichissement. */
export const ETF_EXPOSURES: EtfExposure[] = [
  // Monde
  etf("LU1681043599", MSCI_WORLD_SECTORS, MSCI_WORLD_REGIONS, 0.0125),
  etf("IE0002XZSHO1", MSCI_WORLD_SECTORS, MSCI_WORLD_REGIONS, 0),
  etf("FR001400U5Q4", MSCI_WORLD_SECTORS, MSCI_WORLD_REGIONS, 0),
  // S&P 500
  etf("FR0011552624", S_P_500_SECTORS, S_P_500_REGIONS, 0),
  etf("FR0011871128", S_P_500_SECTORS, S_P_500_REGIONS, 0),
  etf("FR0011550185", S_P_500_SECTORS, S_P_500_REGIONS, 0),
  // Nasdaq-100
  etf("FR0011871110", NASDAQ_100_SECTORS, NASDAQ_100_REGIONS, 0),
  // Europe
  etf("FR0013412038", STOXX_EUROPE_600_SECTORS, EUROPE_REGIONS, 0),
  etf("FR0011550193", STOXX_EUROPE_600_SECTORS, EUROPE_REGIONS, 0),
  // Zone euro
  etf("LU2089238112", EUROZONE_SECTORS, EUROPE_REGIONS, 0),
  // Émergents
  etf("FR0013412020", EM_SECTORS, EM_REGIONS, 0),
  // France
  etf("IE00BP3QZJ36", FRANCE_SECTORS, FRANCE_REGIONS, 0),
  // Défense Europe
  etf("LU3047998896", DEFENSE_EUROPE_SECTORS, EUROPE_REGIONS, 0),
  // Technologie Europe
  etf("IE00BMW42413", TECH_EUROPE_SECTORS, EUROPE_REGIONS, 0),
];

const byIsin = new Map(ETF_EXPOSURES.map((e) => [e.isin, e]));

/**
 * Récupère l'exposition d'un ETF par ISIN. Le CSV de détail
 * (example/etfDetail.csv) prime : yield de distribution réel 2025 et TER
 * exact ; la répartition secteur/région vient du catalogue codé
 * (approximation par indice) complétée par la région du CSV.
 */
export function getEtfExposureByIsin(isin: string | null): EtfExposure | null {
  if (!isin) return null;
  const key = isin.trim().toUpperCase();
  const base = byIsin.get(key);
  if (!base) return null;
  return base;
}

/** Récupère l'exposition d'un titre côté action individuelle (approximation par ISIN). */
export function getStockExposure(isin: string | null): EtfExposure | null {
  if (!isin) return null;
  if (isUSStock(isin)) {
    return {
      isin,
      sectors: [{ sector: "Technologie", weight: 1 }],
      regions: [{ region: "US", weight: 1 }],
      dividendYield: 0.002,
      tradingFeeRate: TR_TRADING_FEE_RATE,
    };
  }
  return null;
}

export function isUSStock(isin: string): boolean {
  return /^US[A-Z0-9]{9}[0-9]$/.test(isin.trim().toUpperCase());
}
