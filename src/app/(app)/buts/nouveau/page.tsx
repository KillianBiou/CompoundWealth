import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getEnvelopeSummaries,
  getGoalSummaries,
  getLinkableEnvelopes,
  getGoalExpectedReturn,
} from "@/server/queries";
import { getAnalysisPositions } from "@/server/analysis";
import { DEFAULT_SAFETY_NET_MONTHS, type GoalType } from "@/lib/goals/progress";
import { averageMonthlySavings, estimateMonthlyExpenses } from "@/lib/analysis/scanners";
import { GoalForm } from "../goal-form";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

const VALID_TYPES: GoalType[] = [
  "SAFETY_NET",
  "FIRE",
  "RETIREMENT",
  "DOWN_PAYMENT",
  "CUSTOM_LIFEVENT",
  "CUSTOM",
];

export default async function NewGoalPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const t = await getLocaleFromCookies().then(getDictionary);
  const [envelopes, user, goals, positions, expectedReturn] = await Promise.all([
    getLinkableEnvelopes(),
    getCurrentUser(),
    getGoalSummaries(),
    getAnalysisPositions(),
    getGoalExpectedReturn(),
  ]);

  const safetyNet = goals.find((g) => g.type === "SAFETY_NET");
  if (typeParam === "SAFETY_NET" && safetyNet) {
    redirect(`/buts/${safetyNet.id}`);
  }

  const valueById = new Map(
    (await getEnvelopeSummaries()).map((e) => [e.id, e.valueCents]),
  );
  const withValues = envelopes.map((env) => ({
    ...env,
    valueCents: valueById.get(env.id) ?? 0,
  }));

  const savings = averageMonthlySavings(positions);
  const expenses = estimateMonthlyExpenses(user?.salaryCents ?? null, savings);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t.goals.new.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.goals.subtitle}</p>
      </div>
      <GoalForm
        envelopes={withValues}
        initial={{
          type: VALID_TYPES.includes(typeParam as GoalType) ? (typeParam as GoalType) : "SAFETY_NET",
          name: "",
          icon: "SAFETY_NET",
          targetMonths: DEFAULT_SAFETY_NET_MONTHS,
          envelopeIds: [],
        }}
        expectedReturn={expectedReturn}
        defaultMonthlyExpensesEur={
          expenses !== null
            ? (expenses / 100).toFixed(2)
            : undefined
        }
      />
    </div>
  );
}
