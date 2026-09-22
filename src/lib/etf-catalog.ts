export interface EtfCatalogEntry {
  ticker: string;
  isin: string;
  name: string;
  issuer: string;
  indexCategory:
    | "Monde"
    | "S&P 500"
    | "Nasdaq-100"
    | "Europe"
    | "Zone euro"
    | "France"
    | "Défense Europe"
    | "Technologie Europe"
    | "Émergents";
  ter: number;
}

export const ETF_CATALOG: EtfCatalogEntry[] = [
  {
    ticker: "CW8",
    isin: "LU1681043599",
    name: "Lyxor/Amundi MSCI World UCITS ETF",
    issuer: "Amundi",
    indexCategory: "Monde",
    ter: 0.0038,
  },
  {
    ticker: "WPEA",
    isin: "IE0002XZSHO1",
    name: "iShares MSCI World Swap PEA UCITS ETF",
    issuer: "iShares",
    indexCategory: "Monde",
    ter: 0.002,
  },
  {
    ticker: "DCAM",
    isin: "FR001400U5Q4",
    name: "Amundi PEA Monde UCITS ETF",
    issuer: "Amundi",
    indexCategory: "Monde",
    ter: 0.002,
  },
  {
    ticker: "PE500",
    isin: "FR0011552624",
    name: "Amundi PEA S&P 500 UCITS ETF",
    issuer: "Amundi",
    indexCategory: "S&P 500",
    ter: 0.0025,
  },
  {
    ticker: "PSP5",
    isin: "FR0011871128",
    name: "Amundi PEA S&P 500 UCITS ETF",
    issuer: "Amundi",
    indexCategory: "S&P 500",
    ter: 0.0012,
  },
  {
    ticker: "ESE",
    isin: "FR0011550185",
    name: "BNP Paribas Easy S&P 500 UCITS ETF",
    issuer: "BNP Paribas",
    indexCategory: "S&P 500",
    ter: 0.0014,
  },
  {
    ticker: "PUST",
    isin: "FR0011871110",
    name: "Amundi PEA Nasdaq-100 UCITS ETF",
    issuer: "Amundi",
    indexCategory: "Nasdaq-100",
    ter: 0.003,
  },
  {
    ticker: "PCEU",
    isin: "FR0013412038",
    name: "Amundi PEA MSCI Europe UCITS ETF",
    issuer: "Amundi",
    indexCategory: "Europe",
    ter: 0.0015,
  },
  {
    ticker: "ETZ",
    isin: "FR0011550193",
    name: "BNP Paribas Easy STOXX Europe 600 UCITS ETF",
    issuer: "BNP Paribas",
    indexCategory: "Europe",
    ter: 0.0018,
  },
  {
    ticker: "PRAZ",
    isin: "LU2089238112",
    name: "Amundi Prime Eurozone UCITS ETF DR",
    issuer: "Amundi",
    indexCategory: "Zone euro",
    ter: 0.0005,
  },
  {
    ticker: "PAEEM",
    isin: "FR0013412020",
    name: "Amundi PEA Émergent MSCI EM ESG Screened UCITS ETF",
    issuer: "Amundi",
    indexCategory: "Émergents",
    ter: 0.003,
  },
  {
    ticker: "IFRE",
    isin: "IE00BP3QZJ36",
    name: "iShares MSCI France UCITS ETF",
    issuer: "iShares",
    indexCategory: "France",
    ter: 0.0025,
  },
  {
    ticker: "BJL8",
    isin: "LU3047998896",
    name: "BNP Paribas Easy Bloomberg Europe Defense UCITS ETF",
    issuer: "BNP Paribas",
    indexCategory: "Défense Europe",
    ter: 0.0035,
  },
  {
    ticker: "ESIT",
    isin: "IE00BMW42413",
    name: "iShares MSCI Europe Information Technology Sector UCITS ETF",
    issuer: "iShares",
    indexCategory: "Technologie Europe",
    ter: 0.0018,
  },
];

export const ETF_CATEGORIES = [
  "Monde",
  "S&P 500",
  "Nasdaq-100",
  "Europe",
  "Zone euro",
  "France",
  "Défense Europe",
  "Technologie Europe",
  "Émergents",
] as const;

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchEtfCatalog(query: string): EtfCatalogEntry[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  return ETF_CATALOG.filter((etf) => {
    const ticker = normalize(etf.ticker);
    const isin = normalize(etf.isin);
    const name = normalize(etf.name);
    const issuer = normalize(etf.issuer);
    const category = normalize(etf.indexCategory);
    return (
      ticker.startsWith(q) ||
      ticker.includes(` ${q}`) ||
      isin.startsWith(q) ||
      name.includes(q) ||
      issuer.startsWith(q) ||
      category.startsWith(q)
    );
  });
}

export function getEtfByIsin(isin: string): EtfCatalogEntry | null {
  const normalized = normalize(isin);
  return ETF_CATALOG.find((etf) => normalize(etf.isin) === normalized) ?? null;
}
