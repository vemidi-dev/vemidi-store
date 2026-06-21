import type { Product } from "@/lib/catalog";
import { ProductLandingHandoffButton } from "@/components/product/product-landing-handoff-button";
import type { ProductLandingPage } from "@/lib/product-landing/types";
import {
  resolveProductLandingCta,
} from "@/lib/product-landing/storefront-cta";

type ProductLandingPageCtaProps = {
  product: Product;
  landingPage: ProductLandingPage | null;
};

export function ProductLandingPageCta({ product, landingPage }: ProductLandingPageCtaProps) {
  const cta = resolveProductLandingCta(landingPage);
  if (!cta || !landingPage) {
    return null;
  }

  return (
    <div className="mt-6">
      <ProductLandingHandoffButton
        product={product}
        landingPage={landingPage}
        label={cta.label}
      />
    </div>
  );
}
