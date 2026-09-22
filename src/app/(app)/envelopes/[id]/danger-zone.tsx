"use client";

import { useState } from "react";
import { deleteEnvelopeAction } from "@/server/actions";
import { Button, Card } from "@/components/ui";

export function EnvelopeDangerZone({
  envelopeId,
  envelopeName,
}: {
  envelopeId: string;
  envelopeName: string;
}) {
  const [confirming, setConfirming] = useState(false);

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
        <form action={deleteEnvelopeAction}>
          <input type="hidden" name="envelopeId" value={envelopeId} />
          <Button variant="danger" type="submit">
            Oui, supprimer définitivement
          </Button>
        </form>
      </div>
    </Card>
  );
}
