import { Plus } from "lucide-react";
import { getEnvelopeSummaries } from "@/server/queries";
import { ButtonLink } from "@/components/ui";
import { EnvelopeCard } from "@/components/envelope-card";

export default async function EnvelopesPage() {
  const envelopes = await getEnvelopeSummaries();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Enveloppes</h1>
        <ButtonLink href="/envelopes/new">
          <Plus className="h-4 w-4" aria-hidden />
          Nouvelle enveloppe
        </ButtonLink>
      </div>
      {envelopes.length === 0 ? (
        <p className="py-16 text-center text-text-secondary">
          Aucune enveloppe active. Créez un PEA ou un CTO pour commencer.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {envelopes.map((e) => (
            <EnvelopeCard key={e.id} envelope={e} />
          ))}
        </div>
      )}
    </div>
  );
}
