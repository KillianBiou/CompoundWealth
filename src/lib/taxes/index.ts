export type EnvelopeType = "PEA" | "CTO";

export interface EnvelopeFiscalRules {
  depositCapCents: number | null;
  incomeTaxAfter5Years: number;
  incomeTaxBefore5Years: number;
  socialLevies: number;
  flatTax: number;
  withdrawalBefore5YearsCloses: boolean;
  depositCapLabel: string;
  badges: string[];
}

export const TAX_YEAR = 2026;

export const SOCIAL_LEVIES_2026 = 0.186;
export const INCOME_TAX_RATE = 0.128;

export const PEA_DEPOSIT_CAP_CENTS = 15_000_000;
export const PEA_ANTIQUITY_YEARS = 5;

export const ENVELOPE_RULES: Record<EnvelopeType, EnvelopeFiscalRules> = {
  PEA: {
    depositCapCents: PEA_DEPOSIT_CAP_CENTS,
    incomeTaxAfter5Years: 0,
    incomeTaxBefore5Years: INCOME_TAX_RATE,
    socialLevies: SOCIAL_LEVIES_2026,
    flatTax: INCOME_TAX_RATE + SOCIAL_LEVIES_2026,
    withdrawalBefore5YearsCloses: true,
    depositCapLabel: "150 000 €",
    badges: [
      `Flat tax ${(INCOME_TAX_RATE + SOCIAL_LEVIES_2026).toLocaleString("fr-FR", { style: "percent", maximumFractionDigits: 1 })} avant 5 ans`,
      "Exonération IR après 5 ans",
    ],
  },
  CTO: {
    depositCapCents: null,
    incomeTaxAfter5Years: INCOME_TAX_RATE,
    incomeTaxBefore5Years: INCOME_TAX_RATE,
    socialLevies: SOCIAL_LEVIES_2026,
    flatTax: INCOME_TAX_RATE + SOCIAL_LEVIES_2026,
    withdrawalBefore5YearsCloses: false,
    depositCapLabel: "Sans plafond",
    badges: [
      `Flat tax ${(INCOME_TAX_RATE + SOCIAL_LEVIES_2026).toLocaleString("fr-FR", { style: "percent", maximumFractionDigits: 1 })}`,
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
