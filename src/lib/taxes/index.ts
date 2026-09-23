export type EnvelopeType = "PEA" | "CTO" | "LIVRET_A";

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
  LIVRET_A: {
    depositCapCents: 2_295_000,
    incomeTaxAfter5Years: 0,
    incomeTaxBefore5Years: 0,
    socialLevies: 0,
    flatTax: 0,
    flatTaxBreakdown: [],
    withdrawalBefore5YearsCloses: false,
    depositCapLabel: "22 950 €",
    incomeTaxIsDurationBased: false,
    badges: ["Intérêts exonérés d'IR et de prélèvements sociaux"],
    details: [
      "Taux fixé par l'État, révisé chaque 1er février et 1er août (1,7 % depuis le 1er août 2026).",
      "Plafond de versements : 22 950 € — au-delà, l'excédent ne rapporte rien.",
      "Intérêts calculés par quinzaine (24 par an), capitalisés le 31 décembre.",
      "Un seul Livret A par personne ; disponibilité immédiate, sans risque de perte en capital.",
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
  /** description « X ans et Y mois restants » pour l'affichage */
  remainingLabel: string;
}

export function peaAntiquity(openedAt: Date, now: Date = new Date()): AntiquityStatus {
  const anniversary = new Date(openedAt);
  anniversary.setFullYear(anniversary.getFullYear() + PEA_ANTIQUITY_YEARS);
  const acquired = now >= anniversary;
  if (acquired) {
    return {
      acquired,
      yearsRemaining: 0,
      daysRemaining: 0,
      anniversaryDate: anniversary,
      remainingLabel: "Ant\u00e9riorit\u00e9 acquise",
    };
  }
  let yearsRemaining = anniversary.getFullYear() - now.getFullYear();
  let monthsRemaining = anniversary.getMonth() - now.getMonth();
  if (anniversary.getDate() < now.getDate()) monthsRemaining -= 1;
  if (monthsRemaining < 0) {
    monthsRemaining += 12;
    yearsRemaining -= 1;
  }
  const daysRemaining = Math.ceil(
    (anniversary.getTime() - now.getTime()) / 86_400_000,
  );
  return {
    acquired,
    yearsRemaining,
    daysRemaining,
    anniversaryDate: anniversary,
    remainingLabel:
      yearsRemaining > 0
        ? `${yearsRemaining} an${yearsRemaining > 1 ? "s" : ""} et ${monthsRemaining} mois restants`
        : monthsRemaining > 0
          ? `${monthsRemaining} mois restants`
          : `${daysRemaining} jour${daysRemaining > 1 ? "s" : ""} restants`,
  };
}
