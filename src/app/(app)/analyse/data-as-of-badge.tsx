import { Badge } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

function formatAsOf(dateIso: string, locale: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Traçabilité de la fiche : date de la dernière collecte des données de
 * référence (CSV actionDetail / etfDetail) et source des données.
 */
export function DataAsOfBadge({
  dataAsOf,
  source,
}: {
  /** date ISO de la dernière mise à jour des données de référence */
  dataAsOf: string;
  /** source des données de référence (ex. « Yahoo Finance », « KID / émetteur ») */
  source?: string;
}) {
  const { t, locale } = useI18n();
  if (!dataAsOf) return null;
  const intlLocale = locale === "en" ? "en-GB" : "fr-FR";
  return (
    <Badge tone="neutral" className="font-normal">
      {t.analyse.detail.common.dataAsOf.replace("{date}", formatAsOf(dataAsOf, intlLocale))}
      {source ? ` · ${source}` : ""}
    </Badge>
  );
}
