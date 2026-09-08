"use server";

import type { CouponPreviewResult } from "@/lib/checkout/coupon";
import {
  previewDiscountCouponForCheckout,
  type DiscountCouponPreviewInput,
} from "@/lib/checkout/coupon-preview";

export async function previewDiscountCoupon(
  input: DiscountCouponPreviewInput,
): Promise<CouponPreviewResult> {
  return previewDiscountCouponForCheckout(input);
}
