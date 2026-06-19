import type { CartLine } from "@/lib/cart-types";
import { normalizeLandingUrl } from "@/lib/campaign-attribution";

export const CHECKOUT_LANDING_RETURN_LABEL = "Обратно към подробната страница";

type CheckoutLandingReturnLine = Pick<CartLine, "landingUrl">;

export function resolveCheckoutLandingReturnUrl(
  lines: readonly CheckoutLandingReturnLine[],
): string | null {
  const uniqueUrls = new Set<string>();

  for (const line of lines) {
    const normalized = normalizeLandingUrl(line.landingUrl);
    if (normalized) {
      uniqueUrls.add(normalized);
    }
  }

  if (uniqueUrls.size !== 1) {
    return null;
  }

  return [...uniqueUrls][0] ?? null;
}

export function getCheckoutLandingReturnLinkProps(url: string) {
  return {
    href: url,
    "aria-label": CHECKOUT_LANDING_RETURN_LABEL,
  };
}
