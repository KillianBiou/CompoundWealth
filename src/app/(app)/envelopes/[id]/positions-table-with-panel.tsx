"use client";

import { useState } from "react";
import { LineChart as LineIcon, PieChart as PieIcon } from "lucide-react";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import type { ActionDetail } from "@/lib/analysis/action-detail";
import { SidePanel } from "@/app/(app)/analyse/side-panel";
import { EtfDetailPanel } from "@/app/(app)/analyse/etf-detail-panel";
import { ActionDetailPanel } from "@/app/(app)/analyse/action-detail-panel";
import { fetchActionPriceHistoryAction } from "@/server/actions";
import { useI18n } from "@/i18n/provider";
import { PositionsTable, type PositionRow } from "./positions-table";

type PricePoint = { date: string; price: number };

/**
 * Table des positions + panneau latéral : ETF et actions ouverts via le
 * même panneau latéral que l'onglet Analyse (détail CSV + graphique de
 * cours pour les actions).
 */
export function PositionsTableWithPanel({
  envelopeId,
  positions,
  etfDetails,
  actionDetails,
}: {
  envelopeId: string;
  positions: PositionRow[];
  /** détails CSV par ISIN (seuls les ETF connus sont cliquables) */
  etfDetails: Record<string, EtfDetail>;
  /** détails CSV des actions, par symbole Yahoo ou ISIN */
  actionDetails: Record<string, ActionDetail>;
}) {
  const { t } = useI18n();
  const [selectedIsin, setSelectedIsin] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionDetail | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);

  const openAction = async (action: ActionDetail) => {
    setSelectedIsin(null);
    setSelectedAction(action);
    setPriceHistory([]);
    try {
      const history = await fetchActionPriceHistoryAction(action.tickerYahoo);
      if (history.ok) setPriceHistory(history.points);
    } catch {
      // historique indisponible : le panneau s'affiche sans graphique
    }
  };

  const closeAll = () => {
    setSelectedIsin(null);
    setSelectedAction(null);
    setPriceHistory([]);
  };

  return (
    <>
      <PositionsTable
        envelopeId={envelopeId}
        positions={positions}
        onSelectPosition={(position) => {
          const etfDetail = position.isin ? etfDetails[position.isin] : undefined;
          if (etfDetail && position.isin) {
            setSelectedAction(null);
            setSelectedIsin(position.isin);
            return;
          }
          const symbol = position.symbol?.trim().toUpperCase();
          const actionDetail = (symbol && actionDetails[symbol]) || undefined;
          if (actionDetail) {
            void openAction(actionDetail);
          }
        }}
        clickableIsins={new Set(
          positions
            .map((p) => p.isin)
            .filter((isin): isin is string => isin !== null && isin in etfDetails),
        )}
        clickableSymbols={new Set(
          positions
            .map((p) => p.symbol?.trim().toUpperCase())
            .filter((symbol): symbol is string => symbol !== undefined && symbol in actionDetails),
        )}
      />
      <SidePanel
        open={selectedIsin !== null || selectedAction !== null}
        onClose={closeAll}
        title={
          selectedAction
            ? selectedAction.longName || selectedAction.name
            : selectedIsin !== null
              ? etfDetails[selectedIsin].trName || etfDetails[selectedIsin].name || selectedIsin
              : ""
        }
        subtitle={
          selectedAction
            ? `${selectedAction.ticker} · ${selectedAction.exchange || selectedAction.tickerYahoo}`
            : (selectedIsin ?? undefined)
        }
        icon={
          selectedAction ? (
            <LineIcon className="h-5 w-5" aria-hidden />
          ) : (
            <PieIcon className="h-5 w-5" aria-hidden />
          )
        }
        copyText={
          selectedAction
            ? JSON.stringify(selectedAction, null, 2)
            : selectedIsin !== null
              ? JSON.stringify(etfDetails[selectedIsin], null, 2)
              : undefined
        }
        copyLabel={t.common.copyDetail}
      >
        {selectedAction ? (
          <ActionDetailPanel action={selectedAction} priceHistory={priceHistory} />
        ) : selectedIsin !== null ? (
          <EtfDetailPanel etf={etfDetails[selectedIsin]} />
        ) : null}
      </SidePanel>
    </>
  );
}
