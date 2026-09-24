"use client";

import { useState } from "react";
import { PieChart as PieIcon } from "lucide-react";
import type { EtfDetail } from "@/lib/analysis/etf-detail";
import { SidePanel } from "@/app/(app)/analyse/side-panel";
import { EtfDetailPanel } from "@/app/(app)/analyse/etf-detail-panel";
import { PositionsTable, type PositionRow } from "./positions-table";

/**
 * Table des positions + panneau latéral de détail ETF : cliquer sur un ETF
 * de la table ouvre le même panneau latéral que l'onglet Analyse.
 */
export function PositionsTableWithPanel({
  envelopeId,
  positions,
  etfDetails,
}: {
  envelopeId: string;
  positions: PositionRow[];
  /** détails CSV par ISIN (seuls les ETF connus sont cliquables) */
  etfDetails: Record<string, EtfDetail>;
}) {
  const [selectedIsin, setSelectedIsin] = useState<string | null>(null);

  return (
    <>
      <PositionsTable
        envelopeId={envelopeId}
        positions={positions}
        onSelectPosition={(position) => {
          const detail = position.isin ? etfDetails[position.isin] : undefined;
          if (!detail) return;
          setSelectedIsin(position.isin);
        }}
        clickableIsins={new Set(
          positions
            .map((p) => p.isin)
            .filter((isin): isin is string => isin !== null && isin in etfDetails),
        )}
      />
      <SidePanel
        open={selectedIsin !== null}
        onClose={() => setSelectedIsin(null)}
        title={
          selectedIsin !== null
            ? etfDetails[selectedIsin].trName || etfDetails[selectedIsin].name || selectedIsin
            : ""
        }
        subtitle={selectedIsin ?? undefined}
        icon={<PieIcon className="h-5 w-5" aria-hidden />}
      >
        {selectedIsin !== null ? <EtfDetailPanel etf={etfDetails[selectedIsin]} /> : null}
      </SidePanel>
    </>
  );
}
