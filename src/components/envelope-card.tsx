import Link from "next/link";
import type { EnvelopeSummary } from "@/server/queries";
import { formatEurCents } from "@/lib/money";
import { Badge, Card } from "./ui";
import { cn } from "./cn";

export function EnvelopeCard({ envelope }: { envelope: EnvelopeSummary }) {
  const gain = envelope.gainCents;
  const gainRatio = envelope.investedCents > 0 && gain !== null ? gain / envelope.investedCents : null;
  return (
    <Link href={`/envelopes/${envelope.id}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-accent-500/50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-text-primary group-hover:text-accent-500">
              {envelope.name}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {envelope.type}
              {envelope.broker ? ` · ${envelope.broker}` : ""}
            </p>
          </div>
          <Badge tone={envelope.type === "PEA" ? "positive" : "warning"}>{envelope.type}</Badge>
        </div>
        <p className="mt-4 font-heading text-2xl font-semibold tabular-nums">
          {formatEurCents(envelope.valueCents)}
        </p>
        {gain !== null && gainRatio !== null ? (
          <p
            className={cn(
              "mt-1 text-sm tabular-nums",
              gain >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {gain >= 0 ? "↗" : "↘"} {formatEurCents(Math.abs(gain))} (
            {(gainRatio * 100).toFixed(1).replace(".", ",")} %)
          </p>
        ) : (
          <p className="mt-1 text-sm text-text-muted italic">
            État des lieux — gain non calculable
          </p>
        )}
        <p className="mt-3 text-xs text-text-muted">
          {envelope.positionsCount} position{envelope.positionsCount > 1 ? "s" : ""}
        </p>
      </Card>
    </Link>
  );
}
