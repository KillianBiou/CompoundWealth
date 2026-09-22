"use client";

import { useState } from "react";
import { deleteAccountAction } from "@/server/actions";
import { Button, Card } from "@/components/ui";

export function DangerZone() {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Card className="border-negative/30">
        <h2 className="font-heading text-lg font-semibold">Zone dangereuse</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Supprimer votre compte efface définitivement vos enveloppes, positions et
          valorisations.
        </p>
        <Button variant="danger" type="button" className="mt-4" onClick={() => setConfirming(true)}>
          Supprimer mon compte
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
        Cette action est irréversible. Toutes vos données seront définitivement effacées.
      </p>
      <div className="mt-4 flex gap-2">
        <Button variant="ghost" type="button" onClick={() => setConfirming(false)}>
          Annuler
        </Button>
        <form action={deleteAccountAction}>
          <Button variant="danger" type="submit">
          Oui, supprimer définitivement
          </Button>
        </form>
      </div>
    </Card>
  );
}
