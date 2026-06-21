import type { ProductLandingPage } from "@/lib/product-landing/types";
import {
  getProductLandingCtaAnchorProps,
  resolveProductLandingCta,
} from "@/lib/product-landing/storefront-cta";

type ProductLandingPageCtaProps = {
  landingPage: ProductLandingPage | null;
};

export function ProductLandingPageCta({ landingPage }: ProductLandingPageCtaProps) {
  const cta = resolveProductLandingCta(landingPage);
  if (!cta) {
    return null;
  }

  const props = getProductLandingCtaAnchorProps(cta);

  return (
    <div className="mt-6">
      <a
        {...props}
        className="inline-flex items-center justify-center rounded-full border border-boutique-accent/30 bg-boutique-warm px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent hover:bg-boutique-accent/10"
      >
        {cta.label}
      </a>
    </div>
  );
}
