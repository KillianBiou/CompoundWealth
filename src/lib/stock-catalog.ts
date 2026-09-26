import { ETF_CATALOG, getEtfByIsin } from "./etf-catalog";

export interface StockCatalogEntry {
  ticker: string;
  isin: string;
  name: string;
  sector: string;
  currency: string;
}

export const STOCK_CATALOG: StockCatalogEntry[] = [
  {
    ticker: "NVDA",
    isin: "US67066G1040",
    name: "NVIDIA",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "AAPL",
    isin: "US0378331005",
    name: "Apple",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "MSFT",
    isin: "US5949181045",
    name: "Microsoft",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "GOOGL",
    isin: "US02079K3059",
    name: "Alphabet (Class A)",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "AMZN",
    isin: "US0231351064",
    name: "Amazon",
    sector: "Consumer Cyclical",
    currency: "USD",
  },
  {
    ticker: "AVGO",
    isin: "US1113371065",
    name: "Broadcom",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "META",
    isin: "US30303M1027",
    name: "Meta Platforms",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "TSLA",
    isin: "US88160R1014",
    name: "Tesla",
    sector: "Consumer Cyclical",
    currency: "USD",
  },
  {
    ticker: "BRK-B",
    isin: "US0846707026",
    name: "Berkshire Hathaway (B)",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "TSM",
    isin: "TW0002330008",
    name: "Taiwan Semiconductor",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "LLY",
    isin: "US5324571083",
    name: "Eli Lilly",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "WMT",
    isin: "US9311422751",
    name: "Walmart",
    sector: "Consumer Defensive",
    currency: "USD",
  },
  {
    ticker: "JPM",
    isin: "US47810F1003",
    name: "JPMorgan Chase",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "V",
    isin: "US92826C8394",
    name: "Visa",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "XOM",
    isin: "US30231G1022",
    name: "Exxon Mobil",
    sector: "Energy",
    currency: "USD",
  },
  {
    ticker: "ORCL",
    isin: "US6844661196",
    name: "Oracle",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "UNH",
    isin: "US91324P1021",
    name: "UnitedHealth",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "MA",
    isin: "US57636Q1040",
    name: "Mastercard",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "JNJ",
    isin: "US4781601046",
    name: "Johnson & Johnson",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "PG",
    isin: "US7427181091",
    name: "Procter & Gamble",
    sector: "Consumer Defensive",
    currency: "USD",
  },
  {
    ticker: "HD",
    isin: "US4370761029",
    name: "Home Depot",
    sector: "Consumer Cyclical",
    currency: "USD",
  },
  {
    ticker: "CSCO",
    isin: "US17275R1023",
    name: "Cisco",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "CRM",
    isin: "US79466L3024",
    name: "Salesforce",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "ADBE",
    isin: "US00724F1012",
    name: "Adobe",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "COST",
    isin: "US2214641050",
    name: "Costco",
    sector: "Consumer Defensive",
    currency: "USD",
  },
  {
    ticker: "NFLX",
    isin: "US64110L1061",
    name: "Netflix",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "AMD",
    isin: "US0079031078",
    name: "AMD",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "ASML.AS",
    isin: "NL0010273215",
    name: "ASML",
    sector: "Technology",
    currency: "EUR",
  },
  {
    ticker: "SAP.DE",
    isin: "DE0007164600",
    name: "SAP",
    sector: "Technology",
    currency: "EUR",
  },
  {
    ticker: "005930.KS",
    isin: "KR7009560009",
    name: "Samsung Electronics",
    sector: "Technology",
    currency: "KRW",
  },
  {
    ticker: "BABA",
    isin: "US01609W1028",
    name: "Alibaba",
    sector: "Consumer Cyclical",
    currency: "USD",
  },
  {
    ticker: "0700.HK",
    isin: "KYG875721634",
    name: "Tencent",
    sector: "Communication Services",
    currency: "HKD",
  },
  {
    ticker: "7203.T",
    isin: "JP3630200003",
    name: "Toyota",
    sector: "Consumer Cyclical",
    currency: "JPY",
  },
  {
    ticker: "2222.SR",
    isin: "SA2H69000RJ3",
    name: "Saudi Aramco",
    sector: "Energy",
    currency: "SAR",
  },
  {
    ticker: "MC.PA",
    isin: "FR0000121014",
    name: "LVMH",
    sector: "Consumer Cyclical",
    currency: "EUR",
  },
  {
    ticker: "NOVO-B.CO",
    isin: "DK0060534915",
    name: "Novo Nordisk",
    sector: "Healthcare",
    currency: "DKK",
  },
  {
    ticker: "RMS.PA",
    isin: "FR0000052292",
    name: "Hermès",
    sector: "Consumer Cyclical",
    currency: "EUR",
  },
  {
    ticker: "NESN.SW",
    isin: "CH0038863350",
    name: "Nestlé",
    sector: "Consumer Defensive",
    currency: "CHF",
  },
  {
    ticker: "NOVN.SW",
    isin: "CH0012005267",
    name: "Novartis",
    sector: "Healthcare",
    currency: "CHF",
  },
  {
    ticker: "SAN.PA",
    isin: "FR0000120578",
    name: "Sanofi",
    sector: "Healthcare",
    currency: "EUR",
  },
  {
    ticker: "TTE.PA",
    isin: "FR0000120271",
    name: "TotalEnergies",
    sector: "Energy",
    currency: "EUR",
  },
  {
    ticker: "SHEL.L",
    isin: "GB00BP80Y363",
    name: "Shell",
    sector: "Energy",
    currency: "GBp",
  },
  {
    ticker: "AZN.L",
    isin: "GB0007033584",
    name: "AstraZeneca",
    sector: "Healthcare",
    currency: "GBp",
  },
  {
    ticker: "HSBA.L",
    isin: "GB0005405396",
    name: "HSBC",
    sector: "Financial Services",
    currency: "GBp",
  },
  {
    ticker: "ULVR.L",
    isin: "IE00B41NTY43",
    name: "Unilever",
    sector: "Consumer Defensive",
    currency: "GBp",
  },
  {
    ticker: "SIE.DE",
    isin: "DE0007236101",
    name: "Siemens",
    sector: "Industrials",
    currency: "EUR",
  },
  {
    ticker: "SU.PA",
    isin: "FR0000121972",
    name: "Schneider Electric",
    sector: "Industrials",
    currency: "EUR",
  },
  {
    ticker: "RELIANCE.NS",
    isin: "INE002A01018",
    name: "Reliance Industries",
    sector: "Energy",
    currency: "INR",
  },
  {
    ticker: "TCS.NS",
    isin: "INE467B01029",
    name: "TCS",
    sector: "Technology",
    currency: "INR",
  },
  {
    ticker: "HDFCBANK.NS",
    isin: "INE040A01034",
    name: "HDFC Bank",
    sector: "Financial Services",
    currency: "INR",
  },
  {
    ticker: "PFE",
    isin: "US7170811033",
    name: "Pfizer",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "CVX",
    isin: "US1667642126",
    name: "Chevron",
    sector: "Energy",
    currency: "USD",
  },
  {
    ticker: "ABBV",
    isin: "US00287Y1091",
    name: "AbbVie",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "MRK",
    isin: "US58933Y1055",
    name: "Merck & Co",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "BAC",
    isin: "US0605051046",
    name: "Bank of America",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "KO",
    isin: "US1912161007",
    name: "Coca-Cola",
    sector: "Consumer Defensive",
    currency: "USD",
  },
  {
    ticker: "MCD",
    isin: "US57013N1063",
    name: "McDonald's",
    sector: "Consumer Cyclical",
    currency: "USD",
  },
  {
    ticker: "PEP",
    isin: "US7134481081",
    name: "PepsiCo",
    sector: "Consumer Defensive",
    currency: "USD",
  },
  {
    ticker: "DIS",
    isin: "US2546871062",
    name: "Disney",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "TMUS",
    isin: "US87264A4024",
    name: "T-Mobile US",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "TMO",
    isin: "US9840321061",
    name: "Thermo Fisher",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "CMCSA",
    isin: "US20030N1019",
    name: "Comcast",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "ABT",
    isin: "US0028241000",
    name: "Abbott Laboratories",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "ACN",
    isin: "IE00B4BNMY62",
    name: "Accenture",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "QCOM",
    isin: "US7475251035",
    name: "Qualcomm",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "TXN",
    isin: "US8728751091",
    name: "Texas Instruments",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "IBM",
    isin: "US4592001014",
    name: "IBM",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "GE",
    isin: "US3696041033",
    name: "General Electric",
    sector: "Industrials",
    currency: "USD",
  },
  {
    ticker: "CAT",
    isin: "US1491231015",
    name: "Caterpillar",
    sector: "Industrials",
    currency: "USD",
  },
  {
    ticker: "HON",
    isin: "US4385161066",
    name: "Honeywell",
    sector: "Industrials",
    currency: "USD",
  },
  {
    ticker: "INTC",
    isin: "US4581401001",
    name: "Intel",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "VZ",
    isin: "US92343V1044",
    name: "Verizon",
    sector: "Communication Services",
    currency: "USD",
  },
  {
    ticker: "PM",
    isin: "US7181721090",
    name: "Philip Morris",
    sector: "Consumer Defensive",
    currency: "USD",
  },
  {
    ticker: "GS",
    isin: "US38141G1040",
    name: "Goldman Sachs",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "MS",
    isin: "US6174464176",
    name: "Morgan Stanley",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "UNP",
    isin: "US9079481091",
    name: "Union Pacific",
    sector: "Industrials",
    currency: "USD",
  },
  {
    ticker: "LMT",
    isin: "US5412791065",
    name: "Lockheed Martin",
    sector: "Industrials",
    currency: "USD",
  },
  {
    ticker: "BKNG",
    isin: "US3156061030",
    name: "Booking Holdings",
    sector: "Consumer Cyclical",
    currency: "USD",
  },
  {
    ticker: "AMGN",
    isin: "US0311621009",
    name: "Amgen",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "MU",
    isin: "US5951121038",
    name: "Micron",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "PLTR",
    isin: "US91939N1038",
    name: "Palantir",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "NOW",
    isin: "US81762P1031",
    name: "ServiceNow",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "ISRG",
    isin: "US4618401088",
    name: "Intuitive Surgical",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "SNPS",
    isin: "US8716071076",
    name: "Synopsys",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "CDNS",
    isin: "US22546N1094",
    name: "Cadence Design",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "AMAT",
    isin: "US0375331099",
    name: "Applied Materials",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "LRCX",
    isin: "US5128061063",
    name: "Lam Research",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "RY",
    isin: "CA7800891021",
    name: "Royal Bank of Canada",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "WFC",
    isin: "US9497461015",
    name: "Wells Fargo",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "AXP",
    isin: "US0258161094",
    name: "American Express",
    sector: "Financial Services",
    currency: "USD",
  },
  {
    ticker: "PANW",
    isin: "US6974351057",
    name: "Palo Alto Networks",
    sector: "Technology",
    currency: "USD",
  },
  {
    ticker: "LIN",
    isin: "IE00B2NPPK76",
    name: "Linde",
    sector: "Basic Materials",
    currency: "USD",
  },
  {
    ticker: "AI.PA",
    isin: "FR0000120073",
    name: "Air Liquide",
    sector: "Basic Materials",
    currency: "EUR",
  },
  {
    ticker: "ALV.DE",
    isin: "DE0008404005",
    name: "Allianz",
    sector: "Financial Services",
    currency: "EUR",
  },
  {
    ticker: "MCK",
    isin: "US58155Q1035",
    name: "McKesson",
    sector: "Healthcare",
    currency: "USD",
  },
  {
    ticker: "ROP.SW",
    isin: "CH0012032048",
    name: "Roche (GS)",
    sector: "Healthcare",
    currency: "CHF",
  },
];

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Recherche unifiée ETF + actions : le DCA et l'ajout de position doivent
 * retrouver les actions du catalogue (NVDA, MC.PA...) comme les ETF.
 * Une action sans ISIN (ex. AIR.PA) n'est pas plannifiable : la clé d'une
 * ligne DCA est l'ISIN.
 */
export interface SecurityCatalogEntry {
  ticker: string;
  isin: string;
  name: string;
  /** secteur pour une action, catégorie d'indice pour un ETF */
  category: string;
  currency: string;
}

export function searchSecurities(query: string): SecurityCatalogEntry[] {
  const q = normalize(query);
  if (q.length === 0) return [];
  const stocks = STOCK_CATALOG.map((stock) => ({
    ticker: stock.ticker,
    isin: stock.isin,
    name: stock.name,
    category: stock.sector,
    currency: stock.currency,
  }));
  const etfs = ETF_CATALOG.map((etf) => ({
    ticker: etf.ticker,
    isin: etf.isin,
    name: etf.name,
    category: etf.indexCategory,
    currency: "EUR",
  }));
  return [...etfs, ...stocks].filter((security) => {
    const ticker = normalize(security.ticker);
    const isin = normalize(security.isin);
    const name = normalize(security.name);
    const category = normalize(security.category);
    return (
      ticker.startsWith(q) ||
      ticker.includes(` ${q}`) ||
      isin.startsWith(q) ||
      name.includes(q) ||
      category.startsWith(q)
    );
  });
}

export function getSecurityByIsin(isin: string): SecurityCatalogEntry | null {
  const normalized = normalize(isin);
  const etf = getEtfByIsin(normalized);
  if (etf) {
    return {
      ticker: etf.ticker,
      isin: etf.isin,
      name: etf.name,
      category: etf.indexCategory,
      currency: "EUR",
    };
  }
  const stock = STOCK_CATALOG.find((s) => normalize(s.isin) === normalized);
  if (stock) {
    return {
      ticker: stock.ticker,
      isin: stock.isin,
      name: stock.name,
      category: stock.sector,
      currency: stock.currency,
    };
  }
  return null;
}

/**
 * Résout un symbole de position : ticker (CW8, NVDA) ou ISIN (positions
 * importées, ex. Trade Republic stocke l'ISIN dans symbol).
 */
export function getSecurityBySymbol(symbol: string): SecurityCatalogEntry | null {
  const normalized = normalize(symbol);
  const byTicker =
    ETF_CATALOG.find((etf) => normalize(etf.ticker) === normalized) ??
    STOCK_CATALOG.find((stock) => normalize(stock.ticker) === normalized);
  if (byTicker) {
    return getSecurityByIsin(byTicker.isin);
  }
  return getSecurityByIsin(normalized);
}
