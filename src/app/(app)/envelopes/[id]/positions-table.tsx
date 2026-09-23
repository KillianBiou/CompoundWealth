import { deletePositionAction } from "@/server/actions";
import { formatEurCents } from "@/lib/money";
import { Badge, Card } from "@/components/ui";
import { AddPositionRow } from "./add-position-row";

const categoryLabels: Record<string, string> = {
  ETF: "ETF",
  STOCK: "Action",
  BOND: "Obligation",
  FUND: "Fonds",
  OTHER: "Autre",
};

export interface PositionRow {
  id: string;
  name: string;
  symbol: string | null;
  category: string;
  investedCents: number | null;
  currentValueCents: number | null;
  boughtAt: Date;
  valuationDate: Date | null;
  valuationSource: string | null;
}

const sourceLabels: Record<string, string> = {
  yahoo: "Yahoo Finance",
  import: "Import",
  manuel: "Saisie manuelle",
};

export function PositionsTable({
  envelopeId,
  positions,
}: {
  envelopeId: string;
  positions: PositionRow[];
}) {
  return (
    <Card className="p-0">
      <div className="flex items-center justify-between p-6 pb-4">
        <h2 className="font-heading text-lg font-semibold">Positions</h2>
        <Badge tone="neutral">{positions.length}</Badge>
      </div>
      {positions.length === 0 ? (
        <>
          <p className="px-6 pb-2 text-sm text-text-secondary">
            Aucune position pour le moment. Ajoutez votre premier ETF.
          </p>
          <AddPositionRow envelopeId={envelopeId} />
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border-cw text-left text-xs uppercase tracking-wide text-text-muted">
                <th className="px-6 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Catégorie</th>
                <th className="px-4 py-3 text-right font-medium">Investi</th>
                <th className="px-4 py-3 text-right font-medium">Valeur actuelle</th>
                <th className="px-4 py-3 font-medium">Date d&apos;achat</th>
                <th className="px-6 py-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-t border-border-cw/60">
                  <td className="px-6 py-3">
                    <span className="font-medium text-text-primary">{p.name}</span>
                    {p.symbol ? (
                      <span className="ml-2 text-xs text-text-muted">{p.symbol}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{categoryLabels[p.category] ?? p.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.investedCents !== null ? (
                      formatEurCents(p.investedCents)
                    ) : (
                      <span className="italic text-text-muted">état des lieux</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.currentValueCents !== null ? (
                      <span>
                        {formatEurCents(p.currentValueCents)}
                        {p.valuationDate ? (
                          <span className="block text-xs font-normal text-text-muted">
                            {p.valuationDate.toLocaleDateString("fr-FR")}
                            {p.valuationSource ? ` · ${sourceLabels[p.valuationSource] ?? p.valuationSource}` : ""}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {p.boughtAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <form action={deletePositionAction}>
                      <input type="hidden" name="positionId" value={p.id} />
                      <input type="hidden" name="envelopeId" value={envelopeId} />
                      <button
                        type="submit"
                        className="text-xs text-text-muted transition-colors hover:text-negative"
                      >
                        Supprimer
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {positions.length > 0 ? <AddPositionRow envelopeId={envelopeId} /> : null}
    </Card>
  );
}
