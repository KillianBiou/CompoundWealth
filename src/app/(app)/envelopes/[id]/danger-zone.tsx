"use client";

import { useState, useTransition } from "react";
import { deleteEnvelopeAction } from "@/server/actions";
import { useToast } from "@/components/toast";
import { Button, Card } from "@/components/ui";

export function EnvelopeDangerZone({
  envelopeId,
  envelopeName,
}: {
  envelopeId: string;
  envelopeName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const remove = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("envelopeId", envelopeId);
      await deleteEnvelopeAction(formData);
      toast.success(`Enveloppe ${envelopeName} supprimée`, {
        details: ["Positions, valorisations et historique effacés définitivement."],
      });
    });
  };

  if (!confirming) {
    return (
      <Card className="border-negative/30">
        <h2 className="font-heading text-lg font-semibold">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Supprimer l&apos;enveloppe <strong>{envelopeName}</strong> efface définitivement ses
          positions, ses valorisations et son historique.
        </p>
        <Button variant="danger" type="button" className="mt-4" onClick={() => setConfirming(true)}>
          Supprimer cette enveloppe
        </Button>
      </Card>
    );
  }
  return (
    <Card className="border-negative/60">
      <h2 className="font-heading text-lg font-semibold text-negative">
        Confirmer la suppression
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Cette action est irréversible. L&apos;enveloppe <strong>{envelopeName}</strong> et toutes
        ses données seront définitivement effacées.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          Annuler
        </Button>
        <Button variant="danger" type="button" disabled={pending} onClick={remove}>
          {pending ? "Suppression…" : "Oui, supprimer définitivement"}
        </Button>
      </div>
    </Card>
  );
}
