"use client";

import { useState } from "react";
import { deleteAccountAction } from "@/server/actions";
import { Button, Card } from "@/components/ui";
import { useI18n } from "@/i18n/provider";

export function DangerZone() {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Card className="border-negative/30">
        <h2 className="font-heading text-lg font-semibold">{t.settings.danger.title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{t.settings.danger.text}</p>
        <Button variant="danger" type="button" className="mt-4" onClick={() => setConfirming(true)}>
          {t.settings.danger.button}
        </Button>
      </Card>
    );
  }
  return (
    <Card className="border-negative/60">
      <h2 className="font-heading text-lg font-semibold text-negative">
        {t.settings.danger.confirmTitle}
      </h2>
      <p className="mt-1 text-sm text-text-secondary">{t.settings.danger.confirmText}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          {t.common.cancel}
        </Button>
        <form action={deleteAccountAction}>
          <Button variant="danger" type="submit">
            {t.settings.danger.confirm}
          </Button>
        </form>
      </div>
    </Card>
  );
}
