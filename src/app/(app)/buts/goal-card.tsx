"use client";

import Link from "next/link";
import type { GoalSummary } from "@/server/queries";
import { formatEurCents } from "@/lib/money";
import { Card } from "@/components/ui";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";
import { GoalStatusBadge } from "./goal-status-badge";



export { GoalStatusBadge };
export { needsAttention, statusTone } from "@/lib/goals/progress";

/**
 * Carte de résumé d'un but : le but et l'actuel en évidence, la métrique
 * selon le type (mois de couverture, rente, montant), barre de progression
 * en corail d'identité (jamais vert/rouge — la progression n'est pas une
 * variation de gain/perte).
 */
export function GoalCard({ goal }: { goal: GoalSummary }) {
  const { t } = useI18n();
  const m = goal.metrics;
  const type = goal.type;

  // matelas : mode réserve (dépenses) → mois ; mode montant → euros
  const safetyAmountMode =
    type === "SAFETY_NET" && m.monthsCovered === null && goal.targetAmountCents !== null;
  const currentText =
    type === "SAFETY_NET"
      ? safetyAmountMode
        ? formatEurCents(goal.linkedValueCents)
        : `${(m.monthsCovered ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${t.goals.new.targetMonthsUnit}`
      : type === "FIRE"
        ? `${formatEurCents(m.currentRentCents ?? 0)}`
        : formatEurCents(goal.linkedValueCents);
  const targetText =
    type === "SAFETY_NET"
      ? safetyAmountMode
        ? formatEurCents(goal.targetAmountCents ?? 0)
        : `${goal.targetMonths ?? 6} ${t.goals.new.targetMonthsUnit}`
      : type === "FIRE"
        ? formatEurCents(goal.targetRentCents ?? 0)
        : formatEurCents(goal.targetAmountCents ?? 0);
  const evolution =
    type === "SAFETY_NET"
      ? safetyAmountMode
        ? `${t.goals.card.contribution} · ${formatEurCents(goal.targetAmountCents ?? 0)}`
        : t.goals.card.monthsCovered
            .replace("{current}", (m.monthsCovered ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))
            .replace("{target}", String(goal.targetMonths ?? 6))
      : type === "FIRE"
        ? `${t.goals.card.rent} · ${t.goals.card.rentTarget.replace("{target}", formatEurCents(goal.targetRentCents ?? 0))}`
        : `${t.goals.card.contribution} · ${formatEurCents(goal.targetAmountCents ?? 0)}`;

  const progressPct = Math.round(m.displayProgress * 100);

  return (
    <Link href={`/buts/${goal.id}`} className="group block">
      <Card
        className={cn(
          "h-full transition-colors",
          m.status === "achieved"
            ? "border-gold/40 bg-gold/5 group-hover:border-gold/70"
            : "group-hover:border-accent-500/50",
        )}
      >
        {/* ligne : identité | actuel→cible | progression */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          {/* identité */}
          <div className="min-w-0 shrink-0 lg:w-56">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium text-text-primary group-hover:text-accent-500">
                {goal.name}
              </p>
              <GoalStatusBadge status={m.status} />
            </div>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {t.goals.categories[type]}
              {goal.targetDate
                ? ` · ${t.goals.card.targetDate.replace(
                    "{date}",
                    goal.targetDate.toLocaleDateString("fr-FR"),
                  )}`
                : ""}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {goal.envelopes.length === 0
                ? t.goals.card.noEnvelopes
                : t.goals.card.envelopesCount
                    .replace("{count}", String(goal.envelopes.length))
                    .replace(/{s}/g, goal.envelopes.length > 1 ? "s" : "")}
              {" · "}
              <span className="font-medium transition-colors group-hover:text-accent-500">
                {t.goals.card.details}
              </span>
            </p>
          </div>

          {/* actuel → cible */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {t.goals.detail.current} → {t.goals.detail.target}
            </p>
            <p className="mt-0.5 truncate font-heading text-2xl font-semibold tabular-nums text-text-primary">
              {currentText}
              <span className="mx-1.5 text-text-muted">→</span>
              <span className="text-text-secondary">{targetText}</span>
            </p>
            <p className="mt-1 truncate text-xs text-text-secondary">
              {evolution}
              {type === "FIRE" && m.capitalTargetCents
                ? ` · ${t.goals.detail.capitalEquivalent.replace("{amount}", formatEurCents(m.capitalTargetCents))}`
                : ""}
            </p>
          </div>

          {/* progression */}
          <div className="shrink-0 lg:w-48">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{t.goals.detail.progressLabel}</span>
              <span className="tabular-nums">{progressPct} %</span>
            </div>
            <div
              className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-subtle"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  m.status === "achieved" ? "bg-gold" : "bg-accent-500",
                )}
                style={{ width: `${Math.min(100, progressPct)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
