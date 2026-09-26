import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, getGoal, getGoalExpectedReturn } from "@/server/queries";
import {
  isCapitalizedGoal,
  monthsBetween,
  projectCapital,
  requiredMonthlySavings,
  requiredTrajectoryAt,
} from "@/lib/goals/progress";
import { formatEurCents, formatPercent } from "@/lib/money";
import { ButtonLink, Card, Kpi } from "@/components/ui";
import { HintLabel } from "@/app/(app)/analyse/hint-label";
import { GoalStatusBadge } from "../goal-status-badge";
import { GoalProgressChart } from "./goal-progress-chart";
import { GoalValueChart } from "./goal-value-chart";
import { GoalProjectionChart } from "./goal-projection-chart";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getLocaleFromCookies().then(getDictionary);
  const [goal, user, expectedReturn] = await Promise.all([
    getGoal(id),
    getCurrentUser(),
    getGoalExpectedReturn(),
  ]);
  if (!goal) notFound();

  const locale = user?.numberLocale === "en" ? ("en" as const) : ("fr" as const);
  const m = goal.metrics;
  const now = new Date();

  const monthsLeft = goal.targetDate
    ? Math.max(0, Math.round(monthsBetween(now, goal.targetDate)))
    : null;
  const yearsLeft = goal.targetDate ? Math.max(0, monthsBetween(now, goal.targetDate) / 12) : 0;

  // métrique actuelle + cible, selon le type (le « X / Y » de la demande)
  const safetyAmountMode =
    goal.type === "SAFETY_NET" && m.monthsCovered === null && goal.targetAmountCents !== null;
  const heroCurrent = (() => {
    if (goal.type === "SAFETY_NET") {
      if (safetyAmountMode) {
        return t.goals.detail.amount
          .replace("{current}", formatEurCents(goal.linkedValueCents))
          .replace("{target}", formatEurCents(goal.targetAmountCents ?? 0));
      }
      return `${(m.monthsCovered ?? 0).toFixed(1)} / ${goal.targetMonths ?? 0} ${t.goals.new.targetMonthsUnit}`;
    }
    if (goal.type === "FIRE") {
      return t.goals.detail.rent
        .replace("{current}", formatEurCents(m.currentRentCents ?? 0))
        .replace("{target}", formatEurCents(goal.targetRentCents ?? 0));
    }
    return t.goals.detail.amount
      .replace("{current}", formatEurCents(goal.linkedValueCents))
      .replace("{target}", formatEurCents(goal.targetAmountCents ?? 0));
  })();

  const heroTarget = (() => {
    if (goal.type === "SAFETY_NET") {
      return safetyAmountMode
        ? formatEurCents(goal.targetAmountCents ?? 0)
        : `${goal.targetMonths ?? 0} ${t.goals.new.targetMonthsUnit}`;
    }
    if (goal.type === "FIRE" && m.capitalTargetCents !== null) {
      return t.goals.detail.capitalEquivalent.replace(
        "{amount}",
        formatEurCents(m.capitalTargetCents),
      );
    }
    return formatEurCents(goal.targetAmountCents ?? 0);
  })();

  // leviers d'ajustement (buts capitalisés avec date cible)
  const showAdjust = isCapitalizedGoal(goal.type) && goal.targetDate !== null;
  const adjustSavingsCents =
    showAdjust && goal.targetAmountCents !== null
      ? requiredMonthlySavings(goal.linkedValueCents, goal.targetAmountCents, yearsLeft, expectedReturn)
      : null;
  const reachableTargetCents =
    showAdjust && goal.targetDate !== null
      ? projectCapital(
          goal.linkedValueCents,
          goal.effectiveMonthlyContributionCents,
          expectedReturn,
          yearsLeft,
        )
      : null;
  const needsAdjust = ["compromised", "underfunded", "late"].includes(m.status);

  // graphique 1 : évolution de la métrique du but par mois + trajectoire requise
  const progressPoints = goal.monthlySeries.map((p) => ({
    date: p.date.getTime(),
    metric: p.metric,
    trajectory: requiredTrajectoryAt(goal.createdAt, goal.targetDate, p.date),
  }));

  // graphique 2 : valeur agrégée des enveloppes liées
  const valuePoints = goal.linkedSeries.map((p) => ({
    date: p.date.getTime(),
    value: p.valueCents / 100,
    invested: null as number | null,
  }));

  // graphique 3 : projection jusqu'à la date cible (buts capitalisés)
  const projectionPoints =
    isCapitalizedGoal(goal.type) && goal.targetDate !== null
      ? Array.from({ length: 13 }, (_, i) => {
          const at = new Date(
            now.getTime() + ((goal.targetDate as Date).getTime() - now.getTime()) * (i / 12),
          );
          const years = (yearsLeft * i) / 12;
          const projectedCents = projectCapital(
            goal.linkedValueCents,
            goal.effectiveMonthlyContributionCents,
            expectedReturn,
            years,
          );
          const trajectory = requiredTrajectoryAt(goal.createdAt, goal.targetDate, at);
          return {
            date: at.getTime(),
            projected: projectedCents / 100,
            required:
              goal.targetAmountCents !== null
                ? (goal.targetAmountCents * trajectory) / 100
                : null,
          };
        })
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/buts" className="text-xs text-text-muted hover:text-accent-500">
            ← {t.goals.detail.back}
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 font-heading text-2xl font-semibold">
            {goal.name}
            <GoalStatusBadge status={m.status} />
          </h1>
        </div>
        <ButtonLink href={`/buts/${goal.id}/modifier`} variant="secondary">
          {t.goals.detail.edit}
        </ButtonLink>
      </div>

      {/* bloc héro : l'actuel et le but en évidence */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <HintLabel uppercase>{t.goals.detail.current}</HintLabel>
            <p className="mt-1 font-heading text-4xl font-semibold tabular-nums">
              {heroCurrent}
            </p>
            <p className="mt-1 text-xs text-text-muted">{heroTarget}</p>
          </div>
          <div className="text-right">
            <HintLabel uppercase hint={t.goals.statusHint[m.status]}>
              {t.goals.detail.progressLabel}
            </HintLabel>
            <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
              {Math.round(m.displayProgress * 100)} %
            </p>
          </div>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-accent-500"
            style={{ width: `${Math.min(100, Math.max(0, m.displayProgress * 100))}%` }}
          />
        </div>
        {goal.targetDate ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
            <span>
              {t.goals.detail.targetDateLabel} : {goal.targetDate.toLocaleDateString(locale)}
            </span>
            <span>
              {t.goals.detail.createdAtLabel} : {goal.createdAt.toLocaleDateString(locale)}
            </span>
          </div>
        ) : null}
      </Card>

      {/* KPIs */}
      <Card className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Kpi
          label={t.goals.detail.contribution}
          value={formatEurCents(goal.effectiveMonthlyContributionCents)}
          hint={t.goals.detail.contributionHint}
        />
        <Kpi
          label={t.goals.detail.requiredReturn}
          value={m.requiredReturn !== null ? formatPercent(m.requiredReturn) : "—"}
          sub={`${t.goals.detail.expectedReturn} : ${formatPercent(expectedReturn)}`}
        />
        {m.requiredMonthlySavingsAtReturnCents !== null ? (
          <Kpi
            label={t.goals.detail.requiredSavingsAtReturn}
            value={formatEurCents(m.requiredMonthlySavingsAtReturnCents)}
            hint={t.goals.detail.requiredSavingsHint}
          />
        ) : (
          <Kpi
            label={t.goals.detail.monthsLeft}
            value={monthsLeft !== null ? String(monthsLeft) : "—"}
          />
        )}
      </Card>

      {/* leviers d'ajustement : si le but est compromis/sous-financé/en retard */}
      {needsAdjust && showAdjust ? (
        <Card className="space-y-3">
          <HintLabel uppercase>{t.goals.detail.adjustTitle}</HintLabel>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border-cw bg-bg-subtle p-3">
              <p className="text-xs text-text-muted">
                {t.goals.detail.adjustSavings.replace("{amount}", "")}
              </p>
              <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums">
                {adjustSavingsCents !== null ? formatEurCents(adjustSavingsCents) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border-cw bg-bg-subtle p-3">
              <p className="text-xs text-text-muted">{t.goals.detail.adjustDate}</p>
              <p className="mt-0.5 text-sm font-medium text-text-primary">
                {goal.targetDate ? goal.targetDate.toLocaleDateString(locale) : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border-cw bg-bg-subtle p-3">
              <p className="text-xs text-text-muted">{t.goals.detail.adjustTarget}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums text-text-primary">
                {reachableTargetCents !== null ? formatEurCents(reachableTargetCents) : "—"}
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* graphique 1 : évolution du but par mois */}
      <Card>
        <div className="mb-4">
          <HintLabel uppercase hint={t.goals.detail.chartProgressHint}>
            {t.goals.detail.chartProgress}
          </HintLabel>
        </div>
        {progressPoints.length > 0 ? (
          <GoalProgressChart
            points={progressPoints}
            type={goal.type}
            metricMode={safetyAmountMode ? "progress" : "months"}
            locale={locale}
          />
        ) : (
          <p className="text-sm text-text-muted">{t.goals.card.noEnvelopes}</p>
        )}
      </Card>

      {/* graphique 2 : valeur des enveloppes liées */}
      <Card>
        <div className="mb-4">
          <HintLabel uppercase hint={t.goals.detail.chartValueHint}>
            {t.goals.detail.chartValue}
          </HintLabel>
        </div>
        {valuePoints.length > 0 ? (
          <GoalValueChart points={valuePoints} locale={locale} />
        ) : (
          <p className="text-sm text-text-muted">{t.goals.card.noEnvelopes}</p>
        )}
      </Card>

      {/* graphique 3 : projection jusqu'à la date cible (buts capitalisés) */}
      {projectionPoints.length > 0 ? (
        <Card>
          <div className="mb-4">
            <HintLabel uppercase hint={t.goals.detail.chartProjectionHint}>
              {t.goals.detail.chartProjection}
            </HintLabel>
          </div>
          <GoalProjectionChart points={projectionPoints} locale={locale} />
        </Card>
      ) : null}

      {/* enveloppes liées */}
      <Card className="space-y-3">
        <HintLabel uppercase>{t.goals.detail.linkedEnvelopes}</HintLabel>
        {goal.envelopes.length === 0 ? (
          <p className="text-sm text-text-muted">{t.goals.card.noEnvelopes}</p>
        ) : (
          <ul className="divide-y divide-border-cw/60">
            {goal.envelopes.map((env) => (
              <li key={env.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  href={`/envelopes/${env.id}`}
                  className="text-sm font-medium hover:text-accent-500"
                >
                  {env.name}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-muted">{env.type}</span>
                  <span className="text-sm tabular-nums text-text-primary">
                    {formatEurCents(env.valueCents)}
                  </span>
                  {goal.linkedValueCents > 0 ? (
                    <span className="text-xs tabular-nums text-text-muted">
                      {t.goals.detail.envelopeShare.replace(
                        "{share}",
                        `${Math.round((env.valueCents / goal.linkedValueCents) * 100)} %`,
                      )}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="text-xs text-text-muted">{t.goals.detail.disclaimer}</p>
    </div>
  );
}
