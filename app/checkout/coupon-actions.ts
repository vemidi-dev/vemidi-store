"use server";

import {
  buildCouponPreviewFailure,
  buildCouponPreviewSuccess,
  isCouponExpired,
  normalizeCouponCode,
  type CouponPreviewResult,
} from "@/lib/checkout/coupon";
import { createServiceClient } from "@/lib/supabase/service";

export async function previewDiscountCoupon(input: {
  code: string;
  subtotal: number;
}): Promise<CouponPreviewResult> {
  const code = normalizeCouponCode(input.code);
  if (!code) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  const subtotal = Number(input.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false,
      code: "coupon_invalid",
      message: "Купонът временно не може да бъде проверен.",
    };
  }

  const { data, error } = await supabase
    .from("discount_coupons")
    .select("code,discount_percentage,is_active,used_at,used_order_id,expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  if (!data.is_active) {
    return buildCouponPreviewFailure("coupon_inactive");
  }

  if (data.used_at || data.used_order_id) {
    return buildCouponPreviewFailure("coupon_used");
  }

  const expiresAt =
    typeof data.expires_at === "string" && data.expires_at.trim()
      ? data.expires_at
      : null;

  if (isCouponExpired(expiresAt)) {
    return buildCouponPreviewFailure("coupon_expired");
  }

  const percentage = Number(data.discount_percentage);
  if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  return buildCouponPreviewSuccess({
    code: String(data.code),
    discountPercentage: percentage,
    subtotal,
    expiresAt,
  });
}
