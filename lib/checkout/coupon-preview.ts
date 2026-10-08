import {
  buildCouponPreviewFailure,
  buildCouponPreviewSuccess,
  isCouponExpired,
  normalizeCouponCode,
  type CouponPreviewResult,
} from "@/lib/checkout/coupon";
import { createServiceClient } from "@/lib/supabase/service";

export type DiscountCouponPreviewInput = {
  code: string;
  subtotal: number;
  /** Line totals eligible for percentage coupons. Defaults to full subtotal. */
  eligibleSubtotal?: number;
  /**
   * Current cart line totals. When present, eligibility is resolved from the
   * products table so stale local cart snapshots cannot over-discount.
   */
  items?: {
    productId: string;
    lineTotal: number;
  }[];
};

function normalizePreviewItems(items: DiscountCouponPreviewInput["items"]) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const normalized: { productId: string; lineTotal: number }[] = [];
  for (const item of items) {
    const productId = typeof item?.productId === "string" ? item.productId.trim() : "";
    const lineTotal = Number(item?.lineTotal);
    if (!productId || !Number.isFinite(lineTotal) || lineTotal < 0) {
      return null;
    }
    normalized.push({ productId, lineTotal });
  }

  return normalized;
}

export async function previewDiscountCouponForCheckout(
  input: DiscountCouponPreviewInput,
): Promise<CouponPreviewResult> {
  const code = normalizeCouponCode(input.code);
  if (!code) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  const subtotal = Number(input.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  let eligibleSubtotal =
    input.eligibleSubtotal === undefined
      ? subtotal
      : Number(input.eligibleSubtotal);
  if (!Number.isFinite(eligibleSubtotal) || eligibleSubtotal < 0) {
    return buildCouponPreviewFailure("coupon_invalid");
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return buildCouponPreviewFailure("coupon_unavailable");
  }

  const previewItems = normalizePreviewItems(input.items);
  if (previewItems) {
    const productIds = Array.from(new Set(previewItems.map((item) => item.productId)));
    const { data: productRows, error: productsError } = await supabase
      .from("products")
      .select("id,promo_code_eligible")
      .in("id", productIds);

    if (productsError || !productRows || productRows.length !== productIds.length) {
      return buildCouponPreviewFailure("coupon_unavailable");
    }

    const eligibilityByProductId = new Map(
      productRows.map((row) => [
        String(row.id),
        (row as { promo_code_eligible?: boolean | null }).promo_code_eligible !== false,
      ]),
    );
    eligibleSubtotal = previewItems.reduce((sum, item) => {
      return eligibilityByProductId.get(item.productId) ? sum + item.lineTotal : sum;
    }, 0);
  }

  const { data, error } = await supabase
    .from("discount_coupons")
    .select("code,discount_percentage,is_active,used_at,used_order_id,expires_at")
    .ilike("code", code)
    .maybeSingle();

  if (error) {
    return buildCouponPreviewFailure("coupon_unavailable");
  }

  if (!data) {
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

  if (eligibleSubtotal <= 0) {
    return buildCouponPreviewFailure("coupon_not_applicable");
  }

  return buildCouponPreviewSuccess({
    code: String(data.code),
    discountPercentage: percentage,
    subtotal,
    eligibleSubtotal,
    expiresAt,
  });
}
