import { checkoutErrorMessages } from "@/lib/checkout/errors";
import type { CartLine } from "@/lib/cart-types";

export type CouponFailureCode =
  | "coupon_invalid"
  | "coupon_used"
  | "coupon_inactive"
  | "coupon_expired"
  | "coupon_not_applicable";

export type CouponEligibilityKind = "all" | "partial" | "none";

export const COUPON_ELIGIBILITY_MESSAGES = {
  partial:
    "Кодът е приложен само към продуктите, за които важи. За заготовки и материали се използват отделни отстъпки според количество.",
  none: "Този код не важи за избраните продукти. За заготовки и материали се използват отделни отстъпки според количество.",
} as const;

export type CouponPreviewResult =
  | {
      ok: true;
      code: string;
      discountPercentage: number;
      subtotal: number;
      eligibleSubtotal: number;
      eligibility: Exclude<CouponEligibilityKind, "none">;
      discountAmount: number;
      total: number;
      expiresAt: string | null;
      eligibilityMessage: string | null;
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/** Missing / legacy cart lines are treated as eligible. */
export function isCartLinePromoCodeEligible(
  line: Pick<CartLine, "promoCodeEligible">,
): boolean {
  return line.promoCodeEligible !== false;
}

export function getCartCouponSubtotals(lines: CartLine[]) {
  let subtotal = 0;
  let eligibleSubtotal = 0;
  let hasIneligibleLines = false;

  for (const line of lines) {
    const lineTotal = line.price * line.quantity;
    subtotal += lineTotal;
    if (isCartLinePromoCodeEligible(line)) {
      eligibleSubtotal += lineTotal;
    } else {
      hasIneligibleLines = true;
    }
  }

  const roundedSubtotal = roundMoney(Math.max(0, subtotal));
  const roundedEligible = roundMoney(Math.max(0, eligibleSubtotal));
  const eligibility: CouponEligibilityKind =
    roundedEligible <= 0
      ? "none"
      : hasIneligibleLines
        ? "partial"
        : "all";

  return {
    subtotal: roundedSubtotal,
    eligibleSubtotal: roundedEligible,
    hasIneligibleLines,
    hasEligibleLines: roundedEligible > 0,
    eligibility,
  };
}

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

/** Percent coupon on eligible subtotal; order total uses full cart subtotal. */
export function computeCouponOrderTotals(
  fullSubtotal: number,
  eligibleSubtotal: number,
  discountPercentage: number,
): {
  subtotal: number;
  eligibleSubtotal: number;
  discountAmount: number;
  total: number;
} {
  const safeFull = Number.isFinite(fullSubtotal) ? Math.max(0, fullSubtotal) : 0;
  const safeEligible = Number.isFinite(eligibleSubtotal)
    ? Math.max(0, Math.min(eligibleSubtotal, safeFull))
    : 0;
  const { discountAmount } = computeCouponDiscount(safeEligible, discountPercentage);

  return {
    subtotal: roundMoney(safeFull),
    eligibleSubtotal: roundMoney(safeEligible),
    discountAmount,
    total: roundMoney(Math.max(0, safeFull - discountAmount)),
  };
}

export function resolveCouponEligibility(
  fullSubtotal: number,
  eligibleSubtotal: number,
): CouponEligibilityKind {
  const safeFull = Number.isFinite(fullSubtotal) ? Math.max(0, fullSubtotal) : 0;
  const safeEligible = Number.isFinite(eligibleSubtotal)
    ? Math.max(0, eligibleSubtotal)
    : 0;

  if (safeEligible <= 0) {
    return "none";
  }
  if (safeEligible + 0.0001 < safeFull) {
    return "partial";
  }
  return "all";
}

export function buildCouponPreviewSuccess(input: {
  code: string;
  discountPercentage: number;
  subtotal: number;
  eligibleSubtotal?: number;
  expiresAt?: string | null;
}): Extract<CouponPreviewResult, { ok: true }> {
  const eligibleSubtotal =
    input.eligibleSubtotal === undefined ? input.subtotal : input.eligibleSubtotal;
  const eligibility = resolveCouponEligibility(input.subtotal, eligibleSubtotal);
  const totals = computeCouponOrderTotals(
    input.subtotal,
    eligibleSubtotal,
    input.discountPercentage,
  );

  return {
    ok: true,
    code: input.code,
    discountPercentage: input.discountPercentage,
    subtotal: totals.subtotal,
    eligibleSubtotal: totals.eligibleSubtotal,
    eligibility: eligibility === "none" ? "all" : eligibility,
    discountAmount: totals.discountAmount,
    total: totals.total,
    expiresAt: input.expiresAt ?? null,
    eligibilityMessage:
      eligibility === "partial" ? COUPON_ELIGIBILITY_MESSAGES.partial : null,
  };
}

export function buildCouponPreviewFailure(
  code: CouponFailureCode,
): Extract<CouponPreviewResult, { ok: false }> {
  return {
    ok: false,
    code,
    message:
      code === "coupon_not_applicable"
        ? COUPON_ELIGIBILITY_MESSAGES.none
        : checkoutErrorMessages[code],
  };
}

/** Clear checkout UX copy when a typed code will not be applied. */
export function describeInvalidCouponCheckoutMessage(
  code: CouponFailureCode,
): string {
  switch (code) {
    case "coupon_expired":
      return "Кодът е изтекъл и няма да бъде приложен.";
    case "coupon_used":
      return "Кодът е вече използван и няма да бъде приложен.";
    case "coupon_inactive":
      return "Кодът е неактивен и няма да бъде приложен.";
    case "coupon_not_applicable":
      return COUPON_ELIGIBILITY_MESSAGES.none;
    case "coupon_invalid":
    default:
      return "Кодът е невалиден и няма да бъде приложен.";
  }
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
