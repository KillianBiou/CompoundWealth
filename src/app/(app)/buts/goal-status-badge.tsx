"use client";

import type { GoalStatus } from "@/lib/goals/progress";
import { Badge } from "@/components/ui";
import { useI18n } from "@/i18n/provider";
import { statusTone } from "./goal-card";

export { statusTone };

/** Badge de statut d'un but avec libellé traduit. */
export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const { t } = useI18n();
  return <Badge tone={statusTone(status)}>{t.goals.status[status]}</Badge>;
}
