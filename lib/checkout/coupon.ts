import { checkoutErrorMessages } from "@/lib/checkout/errors";

export type CouponFailureCode =
  | "coupon_invalid"
  | "coupon_used"
  | "coupon_inactive"
  | "coupon_expired";

export type CouponPreviewResult =
  | {
      ok: true;
      code: string;
      discountPercentage: number;
      subtotal: number;
      discountAmount: number;
      total: number;
      expiresAt: string | null;
    }
  | {
      ok: false;
      code: CouponFailureCode;
      message: string;
    };

export type OrderCouponSummary = {
  couponCode: string;
  discountPercentage: number | null;
  subtotalPrice: number | null;
  discountAmount: number | null;
  totalPrice: number | null;
  couponExpiresAt: string | null;
};

export function normalizeCouponCode(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const code = raw.trim().toUpperCase();
  if (!code) {
    return null;
  }

  if (!/^[A-Z0-9]{4,32}$/.test(code)) {
    return null;
  }

  return code;
}

export function isCouponExpired(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) {
    return false;
  }

  const expires = new Date(expiresAt);
  if (Number.isNaN(expires.getTime())) {
    return false;
  }

  return expires.getTime() <= now.getTime();
}

export function computeCouponDiscount(
  subtotal: number,
  discountPercentage: number,
): { discountAmount: number; total: number } {
  const safeSubtotal = Number.isFinite(subtotal) ? Math.max(0, subtotal) : 0;
  const safePercentage = Number.isFinite(discountPercentage)
    ? Math.min(100, Math.max(0, discountPercentage))
    : 0;
  const discountAmount = Math.round(safeSubtotal * safePercentage) / 100;
  const total = Math.max(0, Math.round((safeSubtotal - discountAmount) * 100) / 100);

  return {
    discountAmount: Math.round(discountAmount * 100) / 100,
    total,
  };
}

export function buildCouponPreviewSuccess(input: {
  code: string;
  discountPercentage: number;
  subtotal: number;
  expiresAt?: string | null;
}): Extract<CouponPreviewResult, { ok: true }> {
  const { discountAmount, total } = computeCouponDiscount(
    input.subtotal,
    input.discountPercentage,
  );

  return {
    ok: true,
    code: input.code,
    discountPercentage: input.discountPercentage,
    subtotal: Math.round(Math.max(0, input.subtotal) * 100) / 100,
    discountAmount,
    total,
    expiresAt: input.expiresAt ?? null,
  };
}

export function buildCouponPreviewFailure(
  code: CouponFailureCode,
): Extract<CouponPreviewResult, { ok: false }> {
  return {
    ok: false,
    code,
    message: checkoutErrorMessages[code],
  };
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export function extractOrderCouponSummary(rawPayload: unknown): OrderCouponSummary | null {
  if (typeof rawPayload !== "object" || rawPayload === null) {
    return null;
  }

  const order = (rawPayload as { order?: unknown }).order;
  if (typeof order !== "object" || order === null) {
    return null;
  }

  const record = order as Record<string, unknown>;
  const couponCode =
    typeof record.couponCode === "string" ? record.couponCode.trim().toUpperCase() : "";

  if (!couponCode) {
    return null;
  }

  return {
    couponCode,
    discountPercentage: asFiniteNumber(record.discountPercentage),
    subtotalPrice: asFiniteNumber(record.subtotalPrice),
    discountAmount: asFiniteNumber(record.discountAmount),
    totalPrice: asFiniteNumber(record.totalPrice),
    couponExpiresAt: asIsoTimestamp(record.couponExpiresAt),
  };
}
