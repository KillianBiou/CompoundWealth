"use client";

import { useCallback, useState } from "react";
import { Card } from "@/components/ui";
import { formatPercent } from "@/lib/money";
import type { EnvelopeSummary } from "@/server/queries";
import { WealthChart, type ChartSeriesToggle } from "./wealth-chart";
import {
  EnvelopeListPanel,
  type EnvelopeKind,
  type VisibleState,
} from "./envelope-list-panel";

export function DashboardWealthSection({
  wealthSeries,
  wealthInvestedSeries,
  envelopeToggles,
  envelopes,
  monthChangeRatio,
  yearChangeRatio,
}: {
  wealthSeries: { date: Date; valueCents: number }[];
  wealthInvestedSeries: { date: Date; valueCents: number }[];
  envelopeToggles: ChartSeriesToggle[];
  envelopes: EnvelopeSummary[];
  monthChangeRatio: number | null;
  yearChangeRatio: number | null;
}) {
  const [visible, setVisible] = useState<VisibleState>(() =>
    Object.fromEntries(envelopeToggles.map((t) => [t.id, true])),
  );

  const onToggleEnvelope = useCallback((id: string) => {
    setVisible((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  }, []);

  const onToggleCategory = useCallback(
    (kind: EnvelopeKind, next?: boolean) => {
      setVisible((prev) => {
        const ids = envelopeToggles.filter((t) => t.kind === kind).map((t) => t.id);
        if (ids.length === 0) return prev;
        const target = next ?? !ids.every((id) => prev[id] ?? true);
        return { ...prev, ...Object.fromEntries(ids.map((id) => [id, target])) };
      });
    },
    [envelopeToggles],
  );

  return (
    <>
      {wealthSeries.length > 1 ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Évolution du patrimoine
              </h2>
              <p className="mt-0.5 text-xs text-text-muted">
                {monthChangeRatio !== null ? (
                  <>
                    1 mois :{" "}
                    <span className={monthChangeRatio >= 0 ? "text-positive" : "text-negative"}>
                      {formatPercent(monthChangeRatio)}
                    </span>
                    {" · "}
                  </>
                ) : null}
                1 an :{" "}
                {yearChangeRatio !== null ? (
                  <span className={yearChangeRatio >= 0 ? "text-positive" : "text-negative"}>
                    {formatPercent(yearChangeRatio)}
                  </span>
                ) : (
                  "historique insuffisant"
                )}
                <span className="ml-1">(hors versements)</span>
              </p>
            </div>
          </div>
          <WealthChart
            valuations={wealthSeries}
            investedPoints={wealthInvestedSeries}
            envelopeToggles={envelopeToggles}
            visible={visible}
            onToggleEnvelope={onToggleEnvelope}
            onToggleCategory={onToggleCategory}
          />
        </Card>
      ) : null}
      <EnvelopeListPanel
        envelopes={envelopes}
        visible={visible}
        onToggleEnvelope={onToggleEnvelope}
        onToggleCategory={onToggleCategory}
      />
    </>
  );
}
