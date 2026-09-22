export type EnvelopeType = "PEA" | "CTO";

export interface TaxBreakdown {
  label: string;
  rate: number;
}

export interface EnvelopeFiscalRules {
  depositCapCents: number | null;
  incomeTaxAfter5Years: number;
  incomeTaxBefore5Years: number;
  socialLevies: number;
  flatTax: number;
  flatTaxBreakdown: TaxBreakdown[];
  withdrawalBefore5YearsCloses: boolean;
  depositCapLabel: string;
  /** true si le taux d'IR dépend de l'ancienneté (PEA), false sinon (CTO) */
  incomeTaxIsDurationBased: boolean;
  badges: string[];
  details: string[];
}

export const TAX_YEAR = 2026;

export const SOCIAL_LEVIES_2026 = 0.186;
export const INCOME_TAX_RATE = 0.128;
export const FLAT_TAX_2026 = INCOME_TAX_RATE + SOCIAL_LEVIES_2026;

export const PEA_DEPOSIT_CAP_CENTS = 15_000_000;
export const PEA_ANTIQUITY_YEARS = 5;

function pct(rate: number): string {
  return `${(rate * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}

export const ENVELOPE_RULES: Record<EnvelopeType, EnvelopeFiscalRules> = {
  PEA: {
    depositCapCents: PEA_DEPOSIT_CAP_CENTS,
    incomeTaxAfter5Years: 0,
    incomeTaxBefore5Years: INCOME_TAX_RATE,
    socialLevies: SOCIAL_LEVIES_2026,
    flatTax: FLAT_TAX_2026,
    flatTaxBreakdown: [
      { label: "Impôt sur le revenu", rate: INCOME_TAX_RATE },
      { label: "Prélèvements sociaux", rate: SOCIAL_LEVIES_2026 },
    ],
    withdrawalBefore5YearsCloses: true,
    depositCapLabel: "150 000 €",
    incomeTaxIsDurationBased: true,
    badges: [
      `Flat tax ${pct(FLAT_TAX_2026)} avant 5 ans`,
      "Exonération IR après 5 ans",
    ],
    details: [
      `Avant 5 ans : flat tax de ${pct(FLAT_TAX_2026)} (${pct(INCOME_TAX_RATE)} d'impôt sur le revenu + ${pct(SOCIAL_LEVIES_2026)} de prélèvements sociaux). Un retrait entraîne la clôture du plan (sauf cas légaux).`,
      `Après 5 ans : exonération d'impôt sur le revenu, seuls les prélèvements sociaux (${pct(SOCIAL_LEVIES_2026)}) restent dus sur les gains.`,
      "Plafond de versements : 150 000 € (hors plus-values ; la valorisation peut dépasser ce montant).",
    ],
  },
  CTO: {
    depositCapCents: null,
    incomeTaxAfter5Years: INCOME_TAX_RATE,
    incomeTaxBefore5Years: INCOME_TAX_RATE,
    socialLevies: SOCIAL_LEVIES_2026,
    flatTax: FLAT_TAX_2026,
    flatTaxBreakdown: [
      { label: "Impôt sur le revenu", rate: INCOME_TAX_RATE },
      { label: "Prélèvements sociaux", rate: SOCIAL_LEVIES_2026 },
    ],
    withdrawalBefore5YearsCloses: false,
    depositCapLabel: "Sans plafond",
    incomeTaxIsDurationBased: false,
    badges: [`Flat tax ${pct(FLAT_TAX_2026)}`],
    details: [
      `Flat tax de ${pct(FLAT_TAX_2026)} sur dividendes, intérêts et plus-values (${pct(INCOME_TAX_RATE)} d'impôt sur le revenu + ${pct(SOCIAL_LEVIES_2026)} de prélèvements sociaux), quelle que soit la durée de détention.`,
      "Option possible pour le barème progressif à la déclaration annuelle (intéressant pour les foyers faiblement imposés).",
      "Aucun plafond de versement ; moins-values imputables sur plus-values de l'année, reportables 10 ans.",
    ],
  },
};

export interface AntiquityStatus {
  acquired: boolean;
  yearsRemaining: number | null;
  daysRemaining: number | null;
  anniversaryDate: Date;
}

export function peaAntiquity(openedAt: Date, now: Date = new Date()): AntiquityStatus {
  const anniversary = new Date(openedAt);
  anniversary.setFullYear(anniversary.getFullYear() + PEA_ANTIQUITY_YEARS);
  const acquired = now >= anniversary;
  if (acquired) {
    return { acquired, yearsRemaining: 0, daysRemaining: 0, anniversaryDate: anniversary };
  }
  const msRemaining = anniversary.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / 86_400_000);
  const yearsRemaining = Math.ceil(daysRemaining / 365.25);
  return { acquired, yearsRemaining, daysRemaining, anniversaryDate: anniversary };
}
