import Link from "next/link";
import { Plus, Shield } from "lucide-react";
import { getGoalSummaries } from "@/server/queries";
import type { GoalType } from "@/lib/goals/progress";
import { ButtonLink, Card } from "@/components/ui";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";
import { GoalCard, needsAttention } from "./goal-card";

/** Ordre d'affichage des catégories. */
const CATEGORY_ORDER: GoalType[] = [
  "SAFETY_NET",
  "FIRE",
  "RETIREMENT",
  "DOWN_PAYMENT",
  "CUSTOM_LIFEVENT",
  "CUSTOM",
];

function categoryKey(type: GoalType): GoalType {
  // FIRE et RETIREMENT partagent la catégorie « Indépendance & retraite »,
  // DOWN_PAYMENT et CUSTOM_LIFEVENT « Projets de vie »
  return type;
}

export default async function GoalsPage() {
  const goals = await getGoalSummaries();
  const t = getDictionary(await getLocaleFromCookies());

  const onTrack = goals.filter((g) => !needsAttention(g.metrics.status)).length;
  const attention = goals.length - onTrack;

  const grouped = new Map<string, typeof goals>();
  for (const goal of goals) {
    const key = t.goals.categories[categoryKey(goal.type)];
    const list = grouped.get(key) ?? [];
    list.push(goal);
    grouped.set(key, list);
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-semibold">{t.goals.title}</h1>
        <p className="max-w-md text-text-secondary">{t.goals.empty}</p>
        <Card className="mt-2 max-w-md border-accent-500/30 bg-accent-100/20 p-6 text-left">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent-500" aria-hidden />
            <p className="font-medium">{t.goals.emptySafetyNet}</p>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {t.goals.emptySafetyNetHint}
          </p>
          <ButtonLink href="/buts/nouveau?type=SAFETY_NET" className="mt-4">
            {t.goals.emptySafetyNet}
          </ButtonLink>
        </Card>
        <ButtonLink href="/buts/nouveau" variant="secondary">
          <Plus className="h-4 w-4" aria-hidden />
          {t.goals.newButton}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">{t.goals.title}</h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {t.goals.subtitle
              .replace("{count}", String(goals.length))
              .replace(/{s}/g, goals.length > 1 ? "s" : "")}
            {" · "}
            {t.goals.combined
              .replace("{on}", String(onTrack))
              .replace("{attention}", String(attention))}
          </p>
        </div>
        <ButtonLink href="/buts/nouveau">
          <Plus className="h-4 w-4" aria-hidden />
          {t.goals.newButton}
        </ButtonLink>
      </div>

      {[...grouped.entries()].map(([category, categoryGoals]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {category}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {categoryGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
