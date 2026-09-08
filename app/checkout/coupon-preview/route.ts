import { NextResponse } from "next/server";

import { buildCouponPreviewFailure } from "@/lib/checkout/coupon";
import {
  previewDiscountCouponForCheckout,
  type DiscountCouponPreviewInput,
} from "@/lib/checkout/coupon-preview";

export const runtime = "nodejs";

function isPreviewPayload(value: unknown): value is DiscountCouponPreviewInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.code === "string";
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    if (!isPreviewPayload(payload)) {
      return NextResponse.json(buildCouponPreviewFailure("coupon_invalid"));
    }

    const result = await previewDiscountCouponForCheckout(payload);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: "coupon_invalid",
        message: "Купонът временно не може да бъде проверен.",
      },
      { status: 200 },
    );
  }
}
