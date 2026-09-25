import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import {
  getFeeAnalysis,
  getIncomeAnalysis,
  getRegionAnalysis,
  getSectorAnalysis,
  getAnalysisPositions,
  getEtfDetailsByIsin,
  getActionDetailsBySymbol,
} from "@/server/analysis";
import { getEnvelopeSummaries } from "@/server/queries";
import { aggregateSeries } from "@/lib/portfolio/series";
import { LIVRET_A_RATE } from "@/lib/livret";
import { buildSimulatorDefaults } from "@/lib/analysis/scanners";
import { AnalysisPageView } from "./analysis-view";

export default async function AnalysePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [fees, income, sectors, regions, positions, envelopes] =
    await Promise.all([
      getFeeAnalysis(),
      getIncomeAnalysis(),
      getSectorAnalysis(),
      getRegionAnalysis(),
      getAnalysisPositions(),
      getEnvelopeSummaries(),
    ]);

  const equityEnvelopes = envelopes.filter((e) => e.type !== "LIVRET_A");
  const equityValuations = aggregateSeries(equityEnvelopes.map((e) => e.series));
  const equityInvested = aggregateSeries(equityEnvelopes.map((e) => e.investedSeries));
  const dcaMonthlyCents = equityEnvelopes.reduce((s, e) => s + (e.dcaMonthlyCents ?? 0), 0);
  const livretEnvelope = envelopes.find((e) => e.type === "LIVRET_A");
  const savingsRate = livretEnvelope?.interestRate ?? LIVRET_A_RATE;
  // le solde du livret A vit dans la série quinzaine (les dépôts ne sont pas
  // des positions) — valeur courante de la série, sinon 0
  const savingsWealthCents = livretEnvelope
    ? livretEnvelope.livretSeries?.[livretEnvelope.livretSeries.length - 1]?.balanceCents ??
      livretEnvelope.valueCents
    : 0;

  const simulatorDefaults = buildSimulatorDefaults({
    positions,
    equityValuations,
    equityInvested,
    dcaMonthlyCents,
    savingsRate,
    savingsWealthCents,
  });

  return (
    <AnalysisPageView
      fees={fees}
      income={income}
      sectors={sectors}
      regions={regions}
      simulatorDefaults={simulatorDefaults}
      etfDetails={getEtfDetailsByIsin()}
      actionDetails={getActionDetailsBySymbol()}
    />
  );
}
