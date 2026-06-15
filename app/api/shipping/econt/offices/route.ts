import { NextResponse } from "next/server";

import {
  getEcontOfficesForDelivery,
  isEcontConfigured,
} from "@/lib/shipping/econt";
import { ECONT_RATE_LIMIT_MESSAGE } from "@/lib/shipping/econt-rate-limit";
import { enforceEcontLookupRateLimit } from "@/lib/shipping/enforce-econt-lookup-rate-limit";

export async function GET(request: Request) {
  if (!isEcontConfigured()) {
    return NextResponse.json(
      { error: "Услугата за офиси временно не е налична." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const cityId = Number.parseInt(String(searchParams.get("cityId") ?? ""), 10);
  const deliveryType = searchParams.get("deliveryType");

  if (!Number.isFinite(cityId) || cityId <= 0) {
    return NextResponse.json({ error: "Невалидни данни за град." }, { status: 400 });
  }

  if (deliveryType !== "office" && deliveryType !== "automat") {
    return NextResponse.json(
      { error: "Невалиден тип доставка." },
      { status: 400 },
    );
  }

  const { decision } = await enforceEcontLookupRateLimit();
  if (decision.kind === "deny") {
    return NextResponse.json({ error: ECONT_RATE_LIMIT_MESSAGE }, { status: 429 });
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
