import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui";
import { ImportForm } from "./import-form";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold">Importer un export bancaire</h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Créez vos enveloppes automatiquement depuis l&apos;historique des transactions de votre
            courtier.
          </p>
        </div>
      </div>
      <Card>
        <ImportForm />
      </Card>
      <Link
        href="/envelopes"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Retour aux enveloppes
      </Link>
    </div>
  );
}
