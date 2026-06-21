import type { ProductLandingPage } from "@/lib/product-landing/types";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";

export const PRODUCT_LANDING_CTA_LABEL = "Разгледай подробно комплекта";
export const PRODUCT_LANDING_CTA_SOURCE_PARAM = "store";

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

  const url = new URL(href);
  url.searchParams.set("source", PRODUCT_LANDING_CTA_SOURCE_PARAM);

  return {
    href: url.toString(),
    label: PRODUCT_LANDING_CTA_LABEL,
  };
}

export function getProductLandingCtaAnchorProps(cta: ProductLandingCta) {
  return {
    href: cta.href,
    target: "_blank" as const,
    rel: "noopener noreferrer",
    "aria-label": `${cta.label} (отваря се в нов tab)`,
  };
}
