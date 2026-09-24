import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { getFeeAnalysis } from "@/server/analysis";
import { getIncomeAnalysis } from "@/server/analysis";
import { getSectorAnalysis } from "@/server/analysis";
import { getRegionAnalysis } from "@/server/analysis";
import { getAverageMonthlySavingsCents } from "@/server/analysis";
import { getEstimatedMonthlyExpensesCents } from "@/server/analysis";
import { getEnvelopeSummaries } from "@/server/queries";
import { simulateWealth } from "@/lib/analysis/scanners";
import { AnalysisPageView } from "./analysis-view";
import type { SimulationResult } from "@/lib/analysis/scanners";

export default async function AnalysePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [fees, income, sectors, regions, avgSavings, monthlyExpenses, envelopes] =
    await Promise.all([
      getFeeAnalysis(),
      getIncomeAnalysis(),
      getSectorAnalysis(),
      getRegionAnalysis(),
      getAverageMonthlySavingsCents(),
      getEstimatedMonthlyExpensesCents(),
      getEnvelopeSummaries(),
    ]);

  const totalWealthCents = envelopes.reduce((s, e) => s + e.valueCents, 0);
  const simulationDefaults = {
    currentWealthCents: totalWealthCents,
    monthlySavingsCents: avgSavings ?? 0,
    monthlyExpensesCents: monthlyExpenses ?? 0,
  };
  const simulation: SimulationResult = simulateWealth({
    ...simulationDefaults,
    annualReturn: 0.05,
    inflation: 0.02,
    horizonYears: 20,
    withdrawalRate: 0.04,
  });

  return (
    <AnalysisPageView
      fees={fees}
      income={income}
      sectors={sectors}
      regions={regions}
      simulation={simulation}
      totalWealthCents={totalWealthCents}
      monthlySavingsCents={avgSavings}
      monthlyExpensesCents={monthlyExpenses}
    />
  );
}
