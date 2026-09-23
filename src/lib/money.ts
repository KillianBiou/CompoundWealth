export function eurosToCents(input: string | number): number {
  const normalized =
    typeof input === "number" ? String(input) : input.replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}

const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatCompactDeterministic(euros: number): string {
  const abs = Math.abs(euros);
  const sign = euros < 0 ? "−" : "";
  const format = (value: number, digits: number, unit: string) => {
    let fixed = value.toFixed(digits);
    if (/\.0$/.test(fixed)) fixed = fixed.slice(0, -2);
    const [int, dec] = fixed.split(".");
    const intFr = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    return `${sign}${intFr}${dec ? "," + dec : ""} ${unit}`;
  };
  if (abs >= 1_000_000) return format(abs / 1_000_000, 1, "M€");
  if (abs >= 10_000) return format(abs / 1_000, 1, "k€");
  if (abs >= 100) return format(abs, 0, "€");
  return format(abs, 1, "€");
}

export function formatEurCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

export function formatEurCentsCompact(cents: number): string {
  return formatCompactDeterministic(cents / 100);
}

export function formatRate(ratio: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(ratio);
}

export function formatPercent(ratio: number): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "percent",
    maximumFractionDigits: 2,
  }).format(ratio);
  return ratio > 0 ? `+${formatted}` : formatted;
}

export type CurrencyCode = "EUR" | "USD" | "GBP" | "CHF";
export type NumberLocale = "fr" | "en";

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "EUR", label: "Euro (€)" },
  { code: "USD", label: "Dollar US ($)" },
  { code: "GBP", label: "Livre sterling (£)" },
  { code: "CHF", label: "Franc suisse (CHF)" },
];

export const NUMBER_LOCALES: { code: NumberLocale; label: string }[] = [
  { code: "fr", label: "1 234,56 (espace + virgule)" },
  { code: "en", label: "1,234.56 (virgule + point)" },
];

const INTL_LOCALE: Record<NumberLocale, string> = {
  fr: "fr-FR",
  en: "en-US",
};

const formatterCache = new Map<string, Intl.NumberFormat>();

function cachedFormatter(
  currency: string,
  locale: NumberLocale,
  compact: boolean,
): Intl.NumberFormat {
  const key = `${currency}|${locale}|${compact ? "c" : "s"}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale] ?? "fr-FR", {
      style: "currency",
      currency,
      ...(compact
        ? { notation: "compact" as const, maximumFractionDigits: 1 }
        : { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatMoneyCents(
  cents: number,
  currency: string = "EUR",
  locale: NumberLocale = "fr",
): string {
  return cachedFormatter(currency, locale, false).format(cents / 100);
}

export function formatMoneyCentsCompact(
  cents: number,
  currency: string = "EUR",
  locale: NumberLocale = "fr",
): string {
  return cachedFormatter(currency, locale, true).format(cents / 100);
}
