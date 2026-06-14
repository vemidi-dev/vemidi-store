import { NextResponse } from "next/server";

import {
  getEcontOfficesForDelivery,
  isEcontConfigured,
} from "@/lib/shipping/econt";

export async function GET(request: Request) {
  if (!isEcontConfigured()) {
    return NextResponse.json(
      { error: "Econt API is not configured." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cityId = Number.parseInt(String(searchParams.get("cityId") ?? ""), 10);
  const deliveryType = searchParams.get("deliveryType");

  if (!Number.isFinite(cityId) || cityId <= 0) {
    return NextResponse.json(
      { error: "Invalid cityId." },
      { status: 400 },
    );
  }

  if (deliveryType !== "office" && deliveryType !== "automat") {
    return NextResponse.json(
      { error: "Invalid deliveryType." },
      { status: 400 },
    );
  }

  try {
    const offices = await getEcontOfficesForDelivery(cityId, deliveryType);
    return NextResponse.json({ offices });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("Econt office search failed:", message);
    return NextResponse.json(
      { error: "Неуспешно зареждане на офиси от Еконт." },
      { status: 502 },
    );
  }
}
