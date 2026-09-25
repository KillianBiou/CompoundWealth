import { Badge } from "@/components/ui";

function formatAsOf(dateIso: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString("fr-FR", {
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
  if (!dataAsOf) return null;
  return (
    <Badge tone="neutral" className="font-normal">
      Données du {formatAsOf(dataAsOf)}
      {source ? ` · ${source}` : ""}
    </Badge>
  );
}
