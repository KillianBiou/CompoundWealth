import { Plus, Upload } from "lucide-react";
import { getEnvelopeSummaries, getEnvelopeClipboardData } from "@/server/queries";
import { envelopesToMarkdown } from "@/lib/clipboard";
import { Badge, ButtonLink } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { EnvelopeCard } from "@/components/envelope-card";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

export default async function EnvelopesPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string }>;
}) {
  const [envelopes, clipboardEnvelopes, { imported }, t] = await Promise.all([
    getEnvelopeSummaries(),
    getEnvelopeClipboardData(),
    searchParams,
    getLocaleFromCookies().then(getDictionary),
  ]);
  const portfolioMarkdown = envelopesToMarkdown(clipboardEnvelopes);
  return (
    <div className="space-y-6">
      {imported ? (
        <Badge tone="positive">
          {t.envelopes.importSuccess
            .replace("{names}", imported.split(", ").join(" · "))
            .replace("{s}", imported.includes(",") ? "s" : "")}
        </Badge>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-semibold">{t.envelopes.title}</h1>
        <div className="flex flex-wrap gap-2">
          {envelopes.length > 0 ? (
            <CopyButton
              text={portfolioMarkdown}
              label={t.envelopes.copyAll}
              variant="button"
              title={t.envelopes.copyAllTitle}
            />
          ) : null}
          <ButtonLink href="/envelopes/import" variant="secondary">
            <Upload className="h-4 w-4" aria-hidden />
            {t.envelopes.importButton}
          </ButtonLink>
          <ButtonLink href="/envelopes/new">
            <Plus className="h-4 w-4" aria-hidden />
            {t.envelopes.newButton}
          </ButtonLink>
        </div>
      </div>
      {envelopes.length === 0 ? (
        <p className="py-16 text-center text-text-secondary">
          {t.envelopes.empty}
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
