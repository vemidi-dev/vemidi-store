"use client";

import { useCallback, useState } from "react";

import type { Product } from "@/lib/catalog";
import { buildLandingHandoffPostFieldsFromDraft } from "@/lib/campaign-landing-handoff-client";
import {
  getProductConfigurationDraftKey,
  parseProductConfigurationDraft,
} from "@/lib/product-configuration-draft";
import type { ProductLandingPage } from "@/lib/product-landing/types";
import { PRODUCT_LANDING_CTA_LABEL } from "@/lib/product-landing/storefront-cta";

type ProductLandingHandoffButtonProps = {
  product: Product;
  landingPage: ProductLandingPage;
  label?: string;
  className?: string;
};

const DEFAULT_ERROR =
  "Възникна проблем при пренасочването. Моля, опитайте отново или продължете с текущите избори.";

export function ProductLandingHandoffButton({
  product,
  landingPage,
  label = PRODUCT_LANDING_CTA_LABEL,
  className,
}: ProductLandingHandoffButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    if (isSubmitting) {
      return;
    }

    setError(null);

    let draft = null;
    try {
      draft = parseProductConfigurationDraft(
        window.localStorage.getItem(getProductConfigurationDraftKey(product.id)),
      );
    } catch {
      setError(DEFAULT_ERROR);
      return;
    }

    if (!draft) {
      setError("Моля, изберете опциите на продукта преди да продължите.");
      return;
    }

    const built = buildLandingHandoffPostFieldsFromDraft(
      product,
      landingPage.slug,
      draft,
    );
    if (!built.ok) {
      setError(built.error);
      return;
    }

    setIsSubmitting(true);

    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/campaign-landing-handoff";
      form.style.display = "none";

      for (const [name, value] of Object.entries(built.fields)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch {
      setIsSubmitting(false);
      setError(DEFAULT_ERROR);
    }
  }, [isSubmitting, landingPage.slug, product]);

  return (
    <div className="max-w-xl">
      <button
        type="button"
        aria-label={label}
        aria-busy={isSubmitting}
        disabled={isSubmitting}
        onClick={handleClick}
        className={
          className ??
          "inline-flex max-w-full items-center justify-center rounded-full border-2 border-boutique-sage-deep px-6 py-3 text-center text-sm font-semibold leading-snug text-boutique-sage-deep transition hover:bg-boutique-sage/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {isSubmitting ? "Пренасочване..." : label}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
