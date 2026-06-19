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

  const anchorProps = getProductLandingCtaAnchorProps(cta);

  return (
    <div className="mt-6 max-w-xl">
      <a
        {...anchorProps}
        className="inline-flex max-w-full items-center justify-center rounded-full border-2 border-boutique-sage-deep px-6 py-3 text-center text-sm font-semibold leading-snug text-boutique-sage-deep transition hover:bg-boutique-sage/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage focus-visible:ring-offset-2"
      >
        {cta.label}
      </a>
    </div>
  );
}
