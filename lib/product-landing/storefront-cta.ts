import type { ProductLandingPage } from "@/lib/product-landing/types";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";

export const PRODUCT_LANDING_CTA_LABEL = "Разгледай подробно комплекта";

export type ProductLandingCta = {
  href: string;
  label: string;
};

export function resolveProductLandingCta(
  landingPage: ProductLandingPage | null,
  baseUrl: URL = getLandingBaseUrl(),
): ProductLandingCta | null {
  if (!landingPage?.isPrimary || !landingPage.isActive) {
    return null;
  }

  const href = buildProductLandingUrl(landingPage.slug, baseUrl);
  if (!href) {
    return null;
  }

  return {
    href,
    label: PRODUCT_LANDING_CTA_LABEL,
  };
}

export function getProductLandingCtaAnchorProps(cta: ProductLandingCta) {
  return {
    href: cta.href,
    "aria-label": cta.label,
  };
}
