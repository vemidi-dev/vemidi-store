import { NextResponse } from "next/server";

import { isEcontConfigured, searchEcontCities } from "@/lib/shipping/econt";

export async function GET(request: Request) {
  if (!isEcontConfigured()) {
    return NextResponse.json(
      { error: "Econt API is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = String(searchParams.get("q") ?? "").trim();

  if (query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  try {
    const cities = await searchEcontCities(query);
    return NextResponse.json({ cities });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Econt city search failed:", message);
    return NextResponse.json(
      { error: "Неуспешно зареждане на населени места от Еконт." },
      { status: 502 },
    );
  }
}
