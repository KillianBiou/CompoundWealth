import { notFound } from "next/navigation";
import {
  getGoal,
  getLinkableEnvelopes,
  getEnvelopeSummaries,
  getGoalExpectedReturn,
} from "@/server/queries";
import { DEFAULT_SAFETY_NET_MONTHS } from "@/lib/goals/progress";
import { GoalForm } from "../../goal-form";
import { GoalDangerZone } from "../goal-danger-zone";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getLocaleFromCookies().then(getDictionary);
  const goal = await getGoal(id);
  if (!goal) notFound();

  const [envelopes, summaries] = await Promise.all([
    getLinkableEnvelopes(),
    getEnvelopeSummaries(),
  ]);
  const valueById = new Map(summaries.map((e) => [e.id, e.valueCents]));
  const withValues = envelopes.map((env) => ({
    ...env,
    valueCents: valueById.get(env.id) ?? 0,
  }));

  const initial = {
    id: goal.id,
    type: goal.type,
    name: goal.name,
    icon: goal.icon,
    targetAmountEur:
      goal.targetAmountCents !== null
        ? (goal.targetAmountCents / 100).toFixed(2)
        : undefined,
    targetRentEur:
      goal.targetRentCents !== null
        ? (goal.targetRentCents / 100).toFixed(2)
        : undefined,
    targetMonths: goal.targetMonths ?? DEFAULT_SAFETY_NET_MONTHS,
    targetDate: goal.targetDate
      ? goal.targetDate.toISOString().slice(0, 10)
      : undefined,
    withdrawalRate:
      goal.withdrawalRate !== null ? String(goal.withdrawalRate) : undefined,
    monthlyExpensesEur:
      goal.monthlyExpensesCents !== null
        ? (goal.monthlyExpensesCents / 100).toFixed(2)
        : undefined,
    monthlyContributionEur:
      goal.monthlyContributionCents !== null
        ? (goal.monthlyContributionCents / 100).toFixed(2)
        : undefined,
    envelopeIds: goal.envelopes.map((e) => e.id),
  };

  const expectedReturn = await getGoalExpectedReturn();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t.goals.edit.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{goal.name}</p>
      </div>
      <GoalForm envelopes={withValues} initial={initial} expectedReturn={expectedReturn} />
      <GoalDangerZone goalId={goal.id} goalName={goal.name} />
    </div>
  );
}
