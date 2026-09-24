import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { fetchMarketQuote } from "@/lib/market/quotes";

/**
 * Recalcul planifié : actualise les prix de toutes les positions (cooldown 5 min
 * par enveloppe, requêtes espacées d'1 s), puis invalide les caches d'analyse.
 * À brancher sur un cron externe (Vercel Cron, GitHub Actions, systemd) :
 *   curl -X POST -H "x-cron-secret: $CRON_SECRET" https://<app>/api/cron/refresh
 * Sans CRON_SECRET configuré, l'endpoint refuse de s'exécuter.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }
  const provided = request.headers.get("x-cron-secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const COOLDOWN_MS = 5 * 60 * 1000;
  const now = Date.now();
  const envelopes = await prisma.envelope.findMany({
    where: { closedAt: null },
    include: { positions: true },
    orderBy: { createdAt: "asc" },
  });

  let updated = 0;
  let failures = 0;
  let firstRequest = true;
  const refreshed: string[] = [];

  for (const envelope of envelopes) {
    const onCooldown =
      envelope.lastPriceRefreshAt !== null &&
      now - envelope.lastPriceRefreshAt.getTime() < COOLDOWN_MS;
    const refreshable = envelope.positions.filter(
      (p) => p.symbol?.trim() && p.quantity !== null,
    );
    if (onCooldown || refreshable.length === 0) continue;

    for (const position of refreshable) {
      if (!firstRequest) await new Promise((resolve) => setTimeout(resolve, 1000));
      firstRequest = false;
      const quote = await fetchMarketQuote(position.symbol!.trim());
      if (!quote.ok) {
        failures += 1;
        continue;
      }
      const valueCents = Math.round(position.quantity! * quote.priceCents);
      await prisma.positionValuation.upsert({
        where: {
          positionId_date: { positionId: position.id, date: new Date() },
        },
        create: {
          positionId: position.id,
          date: new Date(),
          valueCents,
          source: "yahoo",
        },
        update: { valueCents, source: "yahoo" },
      });
      updated += 1;
    }
    await prisma.envelope.update({
      where: { id: envelope.id },
      data: { lastPriceRefreshAt: new Date() },
    });
    refreshed.push(envelope.id);
  }

  return NextResponse.json({
    ok: true,
    envelopesRefreshed: refreshed.length,
    pricesUpdated: updated,
    failures,
  });
}
