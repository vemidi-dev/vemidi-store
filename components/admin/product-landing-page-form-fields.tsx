"use client";

import { useEffect, useState } from "react";

import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { applyPrimaryForcesActive } from "@/lib/product-landing/primary-switch";
import { buildProductLandingUrl, getLandingBaseUrl } from "@/lib/product-landing/url";

type ProductLandingPageFormFieldsProps = {
  initialTitle?: string;
  initialSlug?: string;
  initialCampaignCode?: string | null;
  initialIsPrimary?: boolean;
  initialIsActive?: boolean;
  initialSortOrder?: number;
};

export function ProductLandingPageFormFields({
  initialTitle = "",
  initialSlug = "",
  initialCampaignCode = "",
  initialIsPrimary = false,
  initialIsActive = true,
  initialSortOrder = 0,
}: ProductLandingPageFormFieldsProps) {
  const [slug, setSlug] = useState(initialSlug);
  const [isPrimary, setIsPrimary] = useState(initialIsPrimary);
  const [isActive, setIsActive] = useState(initialIsActive);
  const previewUrl =
    buildProductLandingUrl(slug, getLandingBaseUrl()) ??
    `${getLandingBaseUrl().origin}/${slug || "landing-slug"}`;

  useEffect(() => {
    if (isPrimary && !isActive) {
      setIsActive(true);
    }
  }, [isPrimary, isActive]);

  return (
    <>
      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Заглавие
        <input
          name={adminFormFields.landingPage.title}
          defaultValue={initialTitle}
          required
          className={adminFieldClass}
        />
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Slug
        <input
          name={adminFormFields.landingPage.slug}
          value={slug}
          required
          maxLength={80}
          className={adminFieldClass}
          onChange={(event) => setSlug(event.target.value)}
        />
        <p className={adminHelperClass}>
          Използва се в URL на special subdomain. Само малки латински букви, цифри и
          тирета.
        </p>
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Campaign code
        <input
          name={adminFormFields.landingPage.campaignCode}
          defaultValue={initialCampaignCode ?? ""}
          maxLength={64}
          className={adminFieldClass}
          placeholder="butterflies"
        />
        <p className={adminHelperClass}>
          Незадължително. Използва се за campaign attribution при checkout handoff.
        </p>
      </label>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink">
        {isPrimary ? (
          <input type="hidden" name={adminFormFields.landingPage.isActive} value="on" />
        ) : null}
        <input
          name={isPrimary ? undefined : adminFormFields.landingPage.isActive}
          type="checkbox"
          checked={isActive}
          disabled={isPrimary}
          onChange={(event) => setIsActive(event.target.checked)}
          className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
        />
        Активна
      </label>

      <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink">
        <input
          name={adminFormFields.landingPage.isPrimary}
          type="checkbox"
          checked={isPrimary}
          onChange={(event) => {
            const nextPrimary = event.target.checked;
            const normalized = applyPrimaryForcesActive(nextPrimary, isActive);
            setIsPrimary(normalized.isPrimary);
            setIsActive(normalized.isActive);
          }}
          className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
        />
        Primary landing
      </label>

      <label className="text-sm font-medium text-boutique-ink">
        Подредба
        <input
          name={adminFormFields.landingPage.sortOrder}
          type="number"
          min="0"
          step="1"
          defaultValue={initialSortOrder}
          className={adminFieldClass}
        />
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        URL preview
        <input
          readOnly
          value={previewUrl}
          className={`${adminFieldClass} bg-boutique-bg/70 font-mono text-xs`}
        />
        <p className={adminHelperClass}>
          Primary landing ще се използва от продуктовата страница, когато storefront
          интеграцията бъде добавена. URL се изгражда от base URL + slug.
        </p>
      </label>
    </>
  );
}
