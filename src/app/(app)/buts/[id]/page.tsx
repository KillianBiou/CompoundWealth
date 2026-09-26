import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser, getGoal, getGoalExpectedReturn } from "@/server/queries";
import {
  goalFeasibility,
  isCapitalizedGoal,
  monthsBetween,
  monthsToFillGoal,
  projectCapital,
  requiredMonthlySavings,
  requiredTrajectoryAt,
  DEFAULT_WITHDRAWAL_RATE,
} from "@/lib/goals/progress";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, ButtonLink, Card, Kpi } from "@/components/ui";
import { cn } from "@/components/cn";
import { HintLabel } from "@/app/(app)/analyse/hint-label";
import { GoalStatusBadge } from "../goal-status-badge";
import { GoalProgressChart } from "./goal-progress-chart";
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

  // faisabilité du but : rendement requis vs rendement passé des enveloppes liées
  const feasibility = goalFeasibility(
    goal.type === "SAFETY_NET" ? null : m.requiredReturn,
    goal.linkedPastReturn,
    expectedReturn,
  );
  const feasibilityTone: Record<string, string> = {
    comfortable: "border-positive/30 bg-positive/10",
    achievable: "border-positive/30 bg-positive/10",
    demanding: "border-warning/30 bg-warning/10",
    hard: "border-warning/30 bg-warning/10",
    extreme: "border-negative/30 bg-negative/10",
  };

  // graphique 1 : évolution de la métrique du but par mois + trajectoire requise
  const progressPoints = goal.monthlySeries.map((p) => ({
    date: p.date.getTime(),
    metric: p.metric,
    valueCents: p.valueCents,
    trajectory: requiredTrajectoryAt(goal.createdAt, goal.targetDate, p.date),
  }));

  // suite dorée : projection mensuelle (DCA + rendement attendu) jusqu'au but atteint
  const progressProjectionPoints = (() => {
    const target =
      goal.type === "SAFETY_NET"
        ? m.capitalTargetCents
        : goal.type === "FIRE"
          ? m.capitalTargetCents
          : goal.targetAmountCents;
    if (target === null || target <= goal.linkedValueCents) return [];
    if (goal.effectiveMonthlyContributionCents <= 0 && expectedReturn <= 0) return [];
    const months = monthsToFillGoal(
      goal.linkedValueCents,
      target,
      goal.effectiveMonthlyContributionCents,
      expectedReturn,
    );
    if (months === null) return [];
    const monthlyRate = Math.pow(1 + expectedReturn, 1 / 12) - 1;
    const points: {
      date: number;
      metric: number;
      projected: number;
      projectedValueCents: number;
      trajectory: number;
    }[] = [];
    // point de jonction : la valeur actuelle reprise comme premier point projeté
    let value = goal.linkedValueCents;
    for (let i = 0; i <= months; i += 1) {
      const at = new Date(now.getFullYear(), now.getMonth() + i, 1);
      if (i > 0) value = value * (1 + monthlyRate) + goal.effectiveMonthlyContributionCents;
      const metric =
        goal.type === "SAFETY_NET"
          ? goal.monthlyExpensesCents && goal.monthlyExpensesCents > 0
            ? value / goal.monthlyExpensesCents
            : null
          : goal.type === "FIRE"
            ? Math.round((value * (goal.withdrawalRate ?? DEFAULT_WITHDRAWAL_RATE)) / 12)
            : target > 0
              ? value / target
              : null;
      if (metric !== null) {
        points.push({
          date: at.getTime(),
          metric: i === 0 ? metric : null as unknown as number,
          projected: metric,
          projectedValueCents: value,
          trajectory: requiredTrajectoryAt(goal.createdAt, goal.targetDate, at),
        });
      }
    }
    return points;
  })();

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
      <Card
        className={
          m.status === "achieved"
            ? "space-y-4 border-gold/40 bg-gold/5"
            : "space-y-4"
        }
      >
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
            className={
              m.status === "achieved"
                ? "h-full rounded-full bg-gold"
                : "h-full rounded-full bg-accent-500"
            }
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

      {/* KPIs — une seule bande, trois groupes logiques :
          effort · rendements · échéance */}
      <Card className="flex flex-col gap-6 xl:flex-row xl:items-center xl:gap-0 xl:divide-x xl:divide-border-cw">
        {/* groupe 1 : effort d'épargne */}
        <div className="grid shrink-0 grid-cols-2 gap-6 sm:grid-cols-1 xl:pr-8">
          <Kpi
            label={t.goals.detail.contribution}
            value={formatEurCents(goal.effectiveMonthlyContributionCents)}
            hint={t.goals.detail.contributionHint}
          />
        </div>
        {/* groupe 2 : rendements — requis vs hypothèse vs passé */}
        <div className="grid grid-cols-1 gap-6 border-t border-border-cw pt-6 sm:grid-cols-3 xl:flex-1 xl:border-t-0 xl:pt-0 xl:pl-8 xl:pr-8">
          {goal.type === "SAFETY_NET" ? (
            /* matelas : pas de rendement requis — le remplissage au DCA actuel */
            <Kpi
              label={t.goals.detail.monthsToFill}
              value={
                m.monthsToFill !== null
                  ? `${m.monthsToFill} ${t.goals.detail.monthsUnit}`
                  : "—"
              }
              hint={t.goals.detail.monthsToFillHint}
            />
          ) : (
            <Kpi
              label={t.goals.detail.requiredReturn}
              value={m.requiredReturn !== null ? formatPercent(m.requiredReturn) : "—"}
            />
          )}
          {/*
            Rendement moyen de la bourse : hypothèse long terme des projections.
            PAS UNE PROMESSE — c'est la moyenne historique du marché actions.
          */}
          <Kpi
            label={t.goals.detail.expectedReturn}
            value={formatPercent(expectedReturn)}
            hint={t.goals.detail.expectedReturnHint}
          />
          {/*
            Rendement passé annualisé : SEULEMENT les enveloppes liées à ce but,
            pondérées par leur capital (et son évolution via les DCA/versements).
            LE PASSÉ NE PRÉSAGE PAS DU FUTUR.
          */}
          <Kpi
            label={t.goals.detail.pastReturn}
            value={
              goal.linkedPastReturn !== null
                ? formatPercent(goal.linkedPastReturn)
                : "—"
            }
            hint={t.goals.detail.pastReturnHint}
          />
        </div>
        {/* groupe 3 : échéance — remplissage ou mois restants (buts datés) */}
        {goal.type !== "SAFETY_NET" ? (
          <div className="grid shrink-0 grid-cols-1 gap-6 border-t border-border-cw pt-6 xl:border-t-0 xl:pt-0 xl:pl-8">
            {m.requiredMonthlySavingsAtReturnCents !== null ? (
              <Kpi
                label={t.goals.detail.requiredSavingsAtReturn}
                value={formatEurCents(m.requiredMonthlySavingsAtReturnCents)}
                hint={t.goals.detail.requiredSavingsHint}
              />
            ) : m.monthsToFill !== null ? (
              <Kpi
                label={t.goals.detail.monthsToFill}
                value={`${m.monthsToFill} ${t.goals.detail.monthsUnit}`}
                hint={t.goals.detail.monthsToFillHint}
              />
            ) : (
              <Kpi
                label={t.goals.detail.monthsLeft}
                value={monthsLeft !== null ? String(monthsLeft) : "—"}
              />
            )}
          </div>
        ) : null}
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

      {/* estimation du but : niveau de difficulté coloré (spec §3.3.6) */}
      {feasibility !== null ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-4",
            feasibilityTone[feasibility],
          )}
        >
          <span className="font-heading text-sm font-semibold">
            {t.goals.detail.feasibility[feasibility]}
          </span>
          <span className="text-sm text-text-secondary">
            {t.goals.detail.feasibilityExplain[feasibility]}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
            <span>
              {t.goals.detail.requiredReturn} :{" "}
              {m.requiredReturn !== null ? formatPercent(m.requiredReturn) : "—"}
            </span>
            <span>
              {t.goals.detail.pastReturn} :{" "}
              {goal.linkedPastReturn !== null
                ? formatPercent(goal.linkedPastReturn)
                : formatPercent(expectedReturn)}
            </span>
          </span>
        </div>
      ) : null}

      {/* graphique 1 : évolution du but par mois — métrique ou capital */}
      <Card>
        <div className="mb-4">
          <HintLabel uppercase hint={t.goals.detail.chartProgressHint}>
            {t.goals.detail.chartProgress}
          </HintLabel>
        </div>
        {progressPoints.length > 0 ? (
          <GoalProgressChart
            points={[...progressPoints, ...progressProjectionPoints]}
            metricMode={safetyAmountMode ? "progress" : goal.type === "FIRE" ? "rent" : goal.type === "SAFETY_NET" ? "months" : "progress"}
            locale={locale}
            capitalAvailable={goal.linkedSeries.length > 0}
          />
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
                <span className="flex min-w-0 flex-col gap-1">
                  <Link
                    href={`/envelopes/${env.id}`}
                    className="text-sm font-medium hover:text-accent-500"
                  >
                    {env.name}
                  </Link>
                  {env.sharedGoalNames.length > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <Badge tone="warning">
                        {t.goals.detail.envelopeShared.replace(
                          "{count}",
                          String(env.sharedGoalNames.length),
                        )}
                      </Badge>
                      <span className="truncate text-xs text-text-muted">
                        {env.sharedGoalNames.join(", ")}
                      </span>
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 items-center gap-3">
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
