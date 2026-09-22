import { NextResponse } from "next/server";
import { getInstrumentPrice, searchInstruments } from "@/lib/instruments";
import { getSession } from "@/server/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const price = searchParams.get("price");

  if (price) {
    const quote = await getInstrumentPrice(price);
    return NextResponse.json({ quote });
  }

  const results = await searchInstruments(query);
  return NextResponse.json({ results });
}
