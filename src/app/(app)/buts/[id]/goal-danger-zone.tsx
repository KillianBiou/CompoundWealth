"use client";

import { useState, useTransition } from "react";
import { deleteGoalAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export function GoalDangerZone({
  goalId,
  goalName,
}: {
  goalId: string;
  goalName: string;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const remove = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("goalId", goalId);
      await deleteGoalAction(formData);
      toast.success(t.goals.danger.success.replace("{name}", goalName), {
        details: [t.goals.danger.successDetails],
      });
    });
  };

  if (!confirming) {
    return (
      <Card className="border-negative/30">
        <h2 className="font-heading text-lg font-semibold">{t.goals.danger.title}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          {t.goals.danger.text.replace("{name}", goalName).split("**").map((part, i) =>
            i === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
          )}
        </p>
        <Button variant="danger" type="button" className="mt-4" onClick={() => setConfirming(true)}>
          {t.goals.danger.button}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="border-negative/60">
      <h2 className="font-heading text-lg font-semibold text-negative">
        {t.goals.danger.confirmTitle}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        {t.goals.danger.confirmText.replace("{name}", goalName).split("**").map((part, i) =>
          i === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
        )}
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          {t.common.cancel}
        </Button>
        <Button variant="danger" type="button" disabled={pending} onClick={remove}>
          {t.goals.danger.confirm}
        </Button>
      </div>
    </Card>
  );
}
