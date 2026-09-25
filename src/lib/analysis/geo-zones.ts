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
