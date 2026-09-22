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

const eurCompactFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatEurCents(cents: number): string {
  return eurFormatter.format(cents / 100);
}

export function formatEurCentsCompact(cents: number): string {
  return eurCompactFormatter.format(cents / 100);
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
