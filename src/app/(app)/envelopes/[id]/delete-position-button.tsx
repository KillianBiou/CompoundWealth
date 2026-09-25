"use client";
import { useTransition } from "react";
import { deletePositionAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { useI18n } from "@/i18n/provider";

export function DeletePositionButton({
  positionId,
  envelopeId,
  name,
}: {
  positionId: string;
  envelopeId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const { t } = useI18n();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const formData = new FormData();
          formData.set("positionId", positionId);
          formData.set("envelopeId", envelopeId);
          await deletePositionAction(formData);
          toast.success(t.envelopes.delete.position.replace("{name}", name));
        });
      }}
      className="cursor-pointer rounded-full border border-border-cw bg-bg-subtle px-3 py-1 text-xs text-text-secondary transition-colors hover:border-negative/60 hover:text-negative disabled:opacity-50"
    >
      {t.envelopes.delete.button}
    </button>
  );
}
