"use client";

import Link from "next/link";
import type { GoalSummary } from "@/server/queries";
import type { GoalStatus } from "@/lib/goals/progress";
import { formatEurCents } from "@/lib/money";
import { Card } from "@/components/ui";
import { cn } from "@/components/cn";
import { useI18n } from "@/i18n/provider";
import { GoalStatusBadge } from "./goal-status-badge";



/** Vrai si le statut demande une attention (regroupement "à revoir"). */
export function needsAttention(status: GoalStatus): boolean {
  return ["compromised", "underfunded", "late", "alert"].includes(status);
}

/** Badge de statut d'un but — sémantique des tons existants. */
export function statusTone(status: GoalStatus): "positive" | "negative" | "warning" | "neutral" | "accent" {
  switch (status) {
    case "achieved":
    case "onTrack":
      return "positive";
    case "alert":
    case "late":
      return "negative";
    case "compromised":
    case "underfunded":
      return "warning";
    case "surplus":
      return "accent";
    case "overfunded":
      return "neutral";
  }
}

export { GoalStatusBadge };

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

  const currentText =
    type === "SAFETY_NET"
      ? `${(m.monthsCovered ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${t.goals.new.targetMonthsUnit}`
      : type === "FIRE"
        ? `${formatEurCents(m.currentRentCents ?? 0)}`
        : formatEurCents(goal.linkedValueCents);
  const targetText =
    type === "SAFETY_NET"
      ? `${goal.targetMonths ?? 6} ${t.goals.new.targetMonthsUnit}`
      : type === "FIRE"
        ? formatEurCents(goal.targetRentCents ?? 0)
        : formatEurCents(goal.targetAmountCents ?? 0);

  const evolution =
    type === "SAFETY_NET"
      ? t.goals.card.monthsCovered
          .replace("{current}", (m.monthsCovered ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 1 }))
          .replace("{target}", String(goal.targetMonths ?? 6))
      : type === "FIRE"
        ? `${t.goals.card.rent} · ${t.goals.card.rentTarget.replace("{target}", formatEurCents(goal.targetRentCents ?? 0))}`
        : `${t.goals.card.contribution} · ${formatEurCents(goal.targetAmountCents ?? 0)}`;

  const progressPct = Math.round(m.displayProgress * 100);

  return (
    <Link href={`/buts/${goal.id}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-accent-500/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary group-hover:text-accent-500">
              {goal.name}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {t.goals.categories[type]}
              {goal.targetDate
                ? ` · ${t.goals.card.targetDate.replace(
                    "{date}",
                    goal.targetDate.toLocaleDateString("fr-FR"),
                  )}`
                : ""}
            </p>
          </div>
          <GoalStatusBadge status={m.status} />
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {t.goals.detail.current} → {t.goals.detail.target}
            </p>
            <p className="mt-0.5 font-heading text-2xl font-semibold tabular-nums text-text-primary">
              {currentText}
              <span className="mx-1.5 text-text-muted">→</span>
              <span className="text-text-secondary">{targetText}</span>
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {evolution}
              {type === "FIRE" && m.capitalTargetCents
                ? ` · ${t.goals.detail.capitalEquivalent.replace("{amount}", formatEurCents(m.capitalTargetCents))}`
                : ""}
            </p>
          </div>
        </div>

        <div className="mt-4">
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
              className={cn("h-full rounded-full bg-accent-500")}
              style={{ width: `${Math.min(100, progressPct)}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border-cw/60 pt-3">
          <p className="text-xs text-text-muted">
            {goal.envelopes.length === 0
              ? t.goals.card.noEnvelopes
              : t.goals.card.envelopesCount
                  .replace("{count}", String(goal.envelopes.length))
                  .replace(/{s}/g, goal.envelopes.length > 1 ? "s" : "")}
          </p>
          <p className="text-xs font-medium text-text-muted transition-colors group-hover:text-accent-500">
            {t.goals.card.details}
          </p>
        </div>
      </Card>
    </Link>
  );
}
