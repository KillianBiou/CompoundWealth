/**
 * Zones continentales et constantes géographiques partagées entre le serveur
 * (scanners de diversification) et le client (panneau exposition) — module
 * sans dépendance Node, bundlable côté client.
 */

export type ZoneKey =
  | "AmeriqueNord"
  | "AmeriqueLatine"
  | "Europe"
  | "AsieEst"
  | "AsieEmergente"
  | "AfriqueMoyenOrient"
  | "Oceanie";

export const ZONES: { key: ZoneKey; label: string; flag: string }[] = [
  { key: "AmeriqueNord", label: "Amérique du Nord", flag: "🌎" },
  { key: "AmeriqueLatine", label: "Amérique latine", flag: "🌎" },
  { key: "Europe", label: "Europe", flag: "🇪🇺" },
  { key: "AsieEst", label: "Asie de l'Est (développée)", flag: "🌏" },
  { key: "AsieEmergente", label: "Asie émergente", flag: "🌏" },
  { key: "AfriqueMoyenOrient", label: "Afrique & Moyen-Orient", flag: "🌍" },
  { key: "Oceanie", label: "Océanie", flag: "🦘" },
];

/** Seuil de représentation minimale d'un pays en vue détaillée (fraction). */
export const COUNTRY_SHARE_THRESHOLD = 0.01;

/** Libellé de la ligne agrégée des petits pays et pays non détaillés par le fonds. */
export const OTHER_COUNTRIES_LABEL = "Autres pays";

/** Mapping pays (noms du fichier ETF distant) → zone continentale. */
const COUNTRY_TO_ZONE: Record<string, ZoneKey> = {
  "United States": "AmeriqueNord",
  Canada: "AmeriqueNord",
  Mexico: "AmeriqueLatine",
  Brazil: "AmeriqueLatine",
  Chile: "AmeriqueLatine",
  "United Kingdom": "Europe",
  France: "Europe",
  Germany: "Europe",
  Netherlands: "Europe",
  Switzerland: "Europe",
  Italy: "Europe",
  Spain: "Europe",
  Sweden: "Europe",
  Finland: "Europe",
  Ireland: "Europe",
  Belgium: "Europe",
  Denmark: "Europe",
  Luxembourg: "Europe",
  Poland: "Europe",
  Norway: "Europe",
  Austria: "Europe",
  Portugal: "Europe",
  Greece: "Europe",
  "Czech Republic": "Europe",
  Slovenia: "Europe",
  Hungary: "Europe",
  Russia: "Europe",
  Turkey: "Europe",
  Japan: "AsieEst",
  "Hong Kong": "AsieEst",
  Singapore: "AsieEst",
  Taiwan: "AsieEst",
  China: "AsieEmergente",
  "South Korea": "AsieEmergente",
  India: "AsieEmergente",
  Thailand: "AsieEmergente",
  Malaysia: "AsieEmergente",
  Indonesia: "AsieEmergente",
  Philippines: "AsieEmergente",
  Vietnam: "AsieEmergente",
  "Saudi Arabia": "AfriqueMoyenOrient",
  "United Arab Emirates": "AfriqueMoyenOrient",
  Israel: "AfriqueMoyenOrient",
  Qatar: "AfriqueMoyenOrient",
  Kuwait: "AfriqueMoyenOrient",
  "South Africa": "AfriqueMoyenOrient",
  Egypt: "AfriqueMoyenOrient",
  Morocco: "AfriqueMoyenOrient",
  Nigeria: "AfriqueMoyenOrient",
  Kenya: "AfriqueMoyenOrient",
  Australia: "Oceanie",
  "New Zealand": "Oceanie",
};

export function zoneOfCountry(name: string): ZoneKey | null {
  return COUNTRY_TO_ZONE[name] ?? null;
}

export type EconomyKey = "Developpe" | "Emergent" | "Frontiere";

export const ECONOMIES: { key: EconomyKey; label: string; flag: string }[] = [
  { key: "Developpe", label: "Marchés développés", flag: "🏙️" },
  { key: "Emergent", label: "Marchés émergents", flag: "🌱" },
  { key: "Frontiere", label: "Marchés frontières", flag: "🧭" },
];

/**
 * Mapping pays → type d'économie selon la classification MSCI des marchés
 * (Developed / Emerging / Frontier) — éditions 2025. Cas particuliers :
 * Grèce émergente (reclassification DM effective mai 2027), Corée du Sud et
 * Taïwan émergentes (MSCI, quand FTSE/S&P les classent développées), Luxembourg
 * développé (FTSE/IMF, MSCI ne le couvre pas), Russie rattachée aux émergents
 * (standalone MSCI depuis 2022, sans catégorie dédiée ici) et Slovénie,
 * Vietnam, Maroc, Kenya, Croatie, Roumanie, États baltes et Islande
 * frontières (dont la sous-catégorie MSCI « advanced frontier »).
 */
const COUNTRY_TO_ECONOMY: Record<string, EconomyKey> = {
  "United States": "Developpe",
  Canada: "Developpe",
  Japan: "Developpe",
  "Hong Kong": "Developpe",
  Singapore: "Developpe",
  Australia: "Developpe",
  "New Zealand": "Developpe",
  Israel: "Developpe",
  "United Kingdom": "Developpe",
  France: "Developpe",
  Germany: "Developpe",
  Netherlands: "Developpe",
  Switzerland: "Developpe",
  Italy: "Developpe",
  Spain: "Developpe",
  Sweden: "Developpe",
  Finland: "Developpe",
  Ireland: "Developpe",
  Belgium: "Developpe",
  Denmark: "Developpe",
  Luxembourg: "Developpe",
  Norway: "Developpe",
  Austria: "Developpe",
  Portugal: "Developpe",
  Mexico: "Emergent",
  Brazil: "Emergent",
  Chile: "Emergent",
  Colombia: "Emergent",
  Peru: "Emergent",
  China: "Emergent",
  "South Korea": "Emergent",
  Taiwan: "Emergent",
  India: "Emergent",
  Thailand: "Emergent",
  Malaysia: "Emergent",
  Indonesia: "Emergent",
  Philippines: "Emergent",
  Poland: "Emergent",
  "Czech Republic": "Emergent",
  Greece: "Emergent",
  Hungary: "Emergent",
  Turkey: "Emergent",
  Russia: "Emergent",
  "Saudi Arabia": "Emergent",
  "United Arab Emirates": "Emergent",
  Qatar: "Emergent",
  Kuwait: "Emergent",
  "South Africa": "Emergent",
  Egypt: "Emergent",
  Vietnam: "Frontiere",
  Slovenia: "Frontiere",
  Morocco: "Frontiere",
  Kenya: "Frontiere",
  Nigeria: "Frontiere",
  Croatia: "Frontiere",
  Romania: "Frontiere",
  Estonia: "Frontiere",
  Latvia: "Frontiere",
  Lithuania: "Frontiere",
  Iceland: "Frontiere",
  Pakistan: "Frontiere",
  Bangladesh: "Frontiere",
  "Sri Lanka": "Frontiere",
  Jordan: "Frontiere",
  Kazakhstan: "Frontiere",
  Oman: "Frontiere",
  Bahrain: "Frontiere",
  Serbia: "Frontiere",
  Tunisia: "Frontiere",
};

export function economyOfCountry(name: string): EconomyKey | null {
  return COUNTRY_TO_ECONOMY[name] ?? null;
}
