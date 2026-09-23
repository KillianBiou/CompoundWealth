import { Plus, Upload } from "lucide-react";
import { getEnvelopeSummaries } from "@/server/queries";
import { Badge, ButtonLink } from "@/components/ui";
import { EnvelopeCard } from "@/components/envelope-card";

export default async function EnvelopesPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const [envelopes, { imported }] = await Promise.all([
    getEnvelopeSummaries(),
    searchParams,
  ]);
  return (
    <div className="space-y-6">
      {imported ? (
        <Badge tone="positive">
          Import réussi — {imported.split(", ").join(" · ")} créé{imported.includes(",") ? "s" : ""}
        </Badge>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">Enveloppes</h1>
        <div className="flex gap-2">
          <ButtonLink href="/envelopes/import" variant="secondary">
            <Upload className="h-4 w-4" aria-hidden />
            Importer un export
          </ButtonLink>
          <ButtonLink href="/envelopes/new">
            <Plus className="h-4 w-4" aria-hidden />
            Nouvelle enveloppe
          </ButtonLink>
        </div>
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
