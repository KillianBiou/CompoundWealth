import Link from "next/link";
import type { EnvelopeSummary } from "@/server/queries";
import { formatEurCents, formatPercent } from "@/lib/money";
import { Badge, Card } from "./ui";
import { cn } from "./cn";

function Sparkline({
  series,
  gainCents,
}: {
  series: { date: Date; valueCents: number }[];
  gainCents: number | null;
}) {
  if (series.length < 2) {
    return (
      <div className="flex h-10 items-center justify-end text-[11px] text-text-muted">
        Historique en construction…
      </div>
    );
  }
  const width = 160;
  const height = 40;
  const values = series.map((p) => p.valueCents);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 4 - ((value - min) / span) * (height - 8);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const positive = gainCents === null || gainCents >= 0;
  const stroke = positive ? "var(--positive)" : "var(--negative)";
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-10 w-40"
      role="img"
      aria-label="Évolution récente de la valeur"
      preserveAspectRatio="none"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EnvelopeCard({ envelope }: { envelope: EnvelopeSummary }) {
  const gain = envelope.gainCents;
  const gainRatio = envelope.investedCents > 0 && gain !== null ? gain / envelope.investedCents : null;
  const isLivret = envelope.type === "LIVRET_A";
  const sparkSeries = isLivret && envelope.livretSeries
    ? envelope.livretSeries.map((p) => ({ date: p.date, valueCents: p.balanceCents }))
    : envelope.series;
  return (
    <Link href={`/envelopes/${envelope.id}`} className="group block">
      <Card className="h-full transition-colors group-hover:border-accent-500/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-text-primary group-hover:text-accent-500">
              {envelope.name}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {envelope.type}
              {envelope.broker ? ` · ${envelope.broker}` : ""}
            </p>
          </div>
          <Badge
            tone={
              envelope.type === "PEA"
                ? "positive"
                : envelope.type === "LIVRET_A"
                  ? "neutral"
                  : "warning"
            }
          >
            {envelope.type === "LIVRET_A" ? "Livret A" : envelope.type}
          </Badge>
        </div>
        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-heading text-3xl font-semibold tabular-nums text-text-primary">
              {formatEurCents(envelope.valueCents)}
            </p>
            {gain !== null && gainRatio !== null ? (
              <p
                className={cn(
                  "mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-sm font-semibold tabular-nums",
                  gain >= 0
                    ? "bg-positive/10 text-positive"
                    : "bg-negative/10 text-negative",
                )}
              >
                {gain >= 0 ? "↗" : "↘"} {formatEurCents(Math.abs(gain))}
                <span className="font-normal opacity-80">
                  ({formatPercent(gainRatio)})
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-text-muted italic">
                État des lieux — gain non calculable
              </p>
            )}
          </div>
          <div className="shrink-0">
            <Sparkline series={sparkSeries} gainCents={gain} />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border-cw/60 pt-3">
          <p className="text-xs text-text-muted">
            {isLivret ? (
              <>
                Livret A
                {envelope.overCapCents && envelope.overCapCents > 0 ? (
                  <span className="text-negative">
                    {" "}
                    · {formatEurCents(envelope.overCapCents)} au-dessus du plafond
                  </span>
                ) : null}
              </>
            ) : (
              <>
                {envelope.positionsCount} position{envelope.positionsCount > 1 ? "s" : ""}
                {envelope.investedCents > 0 ? (
                  <span className="text-text-secondary">
                    {" "}
                    · investi {formatEurCents(envelope.investedCents)}
                  </span>
                ) : null}
              </>
            )}
          </p>
          <p className="text-xs font-medium text-text-muted transition-colors group-hover:text-accent-500">
            Détails →
          </p>
        </div>
      </Card>
    </Link>
  );
}
