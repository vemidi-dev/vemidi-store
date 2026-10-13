import { NextResponse } from "next/server";

import { isSpeedyConfigured, searchSpeedyCities } from "@/lib/shipping/speedy";
import {
  ECONT_RATE_LIMIT_MESSAGE,
  normalizeEcontLookupQuery,
} from "@/lib/shipping/econt-rate-limit";
import { enforceEcontLookupRateLimit } from "@/lib/shipping/enforce-econt-lookup-rate-limit";

export async function GET(request: Request) {
  if (!isSpeedyConfigured()) {
    return NextResponse.json(
      { error: "Услугата за населени места на Спиди временно не е налична." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = normalizeEcontLookupQuery(searchParams.get("q"));

  if (query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  const { decision } = await enforceEcontLookupRateLimit();
  if (decision.kind === "deny") {
    return NextResponse.json({ error: ECONT_RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  try {
    const cities = await searchSpeedyCities(query);
    return NextResponse.json({ cities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Speedy city search failed:", message);
    return NextResponse.json(
      { error: "Неуспешно зареждане на населени места от Спиди." },
      { status: 502 },
    );
  }
}
