import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, Card } from "@/components/ui";
import { AddPositionRow } from "./add-position-row";
import { DeletePositionButton } from "./delete-position-button";

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
  /** ISIN si la position correspond à un ETF du catalogue, sinon null */
  isin: string | null;
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
  onSelectPosition,
  clickableIsins,
  clickableSymbols,
}: {
  envelopeId: string;
  positions: PositionRow[];
  /** appelé au clic sur un ETF connu du catalogue (ouvre le panneau latéral) */
  onSelectPosition?: (position: PositionRow) => void;
  /** ISIN cliquables — les autres lignes restent inertes */
  clickableIsins?: Set<string>;
  /** tickers/symboles Yahoo cliquables (actions), les autres lignes restent inertes */
  clickableSymbols?: Set<string>;
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
              <tr className="border-b-2 border-border-cw bg-bg-subtle/50 text-left text-xs uppercase tracking-wide text-text-muted">
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
                <tr key={p.id} className="border-b border-border-cw/40 transition-colors hover:bg-bg-subtle/30">
                  <td className="px-6 py-3">
                    {onSelectPosition &&
                    ((p.isin && clickableIsins?.has(p.isin)) ||
                      (p.symbol && clickableSymbols?.has(p.symbol.trim().toUpperCase()))) ? (
                      <button
                        type="button"
                        onClick={() => onSelectPosition(p)}
                        title={
                          p.isin && clickableIsins?.has(p.isin)
                            ? "Voir le détail de l'ETF"
                            : "Voir le détail de l'action"
                        }
                        className="cursor-pointer text-left font-medium text-text-primary transition-colors hover:text-accent-500"
                      >
                        {p.name}
                        {p.symbol ? (
                          <span className="ml-2 text-xs font-normal text-text-muted">
                            {p.symbol}
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <>
                        <span className="font-medium text-text-primary">{p.name}</span>
                        {p.symbol ? (
                          <span className="ml-2 text-xs text-text-muted">{p.symbol}</span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{categoryLabels[p.category] ?? p.category}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.investedCents !== null ? (
                      <span className="font-semibold text-text-secondary">
                        {formatEurCents(p.investedCents)}
                      </span>
                    ) : (
                      <span className="italic text-text-muted">état des lieux</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {(() => {
                      if (p.currentValueCents === null) {
                        return <span className="text-text-muted">—</span>;
                      }
                      const gainCents =
                        p.investedCents !== null ? p.currentValueCents - p.investedCents : null;
                      const gainRatio =
                        gainCents !== null && p.investedCents && p.investedCents > 0
                          ? gainCents / p.investedCents
                          : null;
                      const tone =
                        gainCents === null || gainCents === 0
                          ? "text-text-primary"
                          : gainCents > 0
                            ? "text-positive"
                            : "text-negative";
                      return (
                        <span className={`font-semibold ${tone}`}>
                          {formatEurCents(p.currentValueCents)}
                          {gainRatio !== null ? (
                            <span
                              className={`block text-xs font-normal ${gainCents === 0 ? "text-text-muted" : tone}`}
                            >
                              ({formatPercent(gainRatio)})
                            </span>
                          ) : null}
                          {p.valuationDate ? (
                            <span className="block text-xs font-normal text-text-muted">
                              {p.valuationDate.toLocaleDateString("fr-FR")}
                              {p.valuationSource ? ` · ${sourceLabels[p.valuationSource] ?? p.valuationSource}` : ""}
                            </span>
                          ) : null}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-text-secondary tabular-nums">
                    {p.boughtAt.toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <DeletePositionButton
                      positionId={p.id}
                      envelopeId={envelopeId}
                      name={p.symbol ?? p.name}
                    />
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
