import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import { SeoResolvedPreview } from "@/components/admin/seo-resolved-preview";
import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import {
  getProductContentFormDefaults,
  productContentLimits,
} from "@/lib/admin/product-content";
import { resolveProductSeoPreview } from "@/lib/admin/seo-resolved-preview";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductRow } from "@/lib/admin/types";

type ProductContentSeoFieldsProps = {
  product?: Pick<
    ProductRow,
    | "name"
    | "description"
    | "meta_title"
    | "meta_description"
    | "og_title"
    | "og_description"
    | "is_customizable"
    | "fulfillment_type"
    | "fulfillment_note"
    | "card_badge"
  >;
  defaults?: {
    meta_title?: string;
    meta_description?: string;
    og_title?: string;
    og_description?: string;
  };
  /** Optional display name when creating (no saved product row yet). */
  previewName?: string;
  previewDescription?: string;
  primaryCategoryName?: string | null;
  primaryCategorySlug?: string | null;
  className?: string;
};

export function ProductContentSeoFields({
  product,
  defaults: defaultsOverride,
  previewName,
  previewDescription,
  primaryCategoryName,
  primaryCategorySlug,
  className = "mt-4",
}: ProductContentSeoFieldsProps) {
  const defaults = {
    ...getProductContentFormDefaults(product),
    ...defaultsOverride,
  };

  const resolvedPreview = resolveProductSeoPreview({
    name: product?.name || previewName || "Продукт",
    description: product?.description ?? previewDescription ?? "",
    meta_title: defaults.meta_title,
    meta_description: defaults.meta_description,
    og_title: defaults.og_title,
    og_description: defaults.og_description,
    customizable: product?.is_customizable,
    fulfillmentType: product?.fulfillment_type,
    fulfillmentNote: product?.fulfillment_note,
    cardBadge: product?.card_badge,
    primaryCategory:
      primaryCategoryName && primaryCategorySlug
        ? { name: primaryCategoryName, slug: primaryCategorySlug }
        : null,
  });

  return (
    <AdminSectionAccordion
      title="SEO метаданни"
      countLabel="Title, description и споделяне"
      className={className}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
          SEO заглавие
          <input
            name={adminFormFields.product.metaTitle}
            defaultValue={defaults.meta_title}
            maxLength={productContentLimits.meta_title}
            className={adminFieldClass}
          />
          <span className={adminHelperClass}>
            HTML title за продуктовата страница. Празно → името на продукта. Макс.{" "}
            {productContentLimits.meta_title} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink md:col-span-2">
          Meta описание
          <textarea
            name={adminFormFields.product.metaDescription}
            rows={3}
            defaultValue={defaults.meta_description}
            maxLength={productContentLimits.meta_description}
            className={`${adminFieldClass} min-h-20 resize-y`}
          />
          <span className={adminHelperClass}>
            Meta description за търсачки. Празно → описание или композиран fallback. Макс.{" "}
            {productContentLimits.meta_description} символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Заглавие при споделяне
          <input
            name={adminFormFields.product.ogTitle}
            defaultValue={defaults.og_title}
            maxLength={productContentLimits.og_title}
            className={adminFieldClass}
          />
          <span className={adminHelperClass}>
            Open Graph title. Празно → SEO заглавие. Макс. {productContentLimits.og_title}{" "}
            символа.
          </span>
        </label>

        <label className="text-sm font-medium text-boutique-ink">
          Описание при споделяне
          <textarea
            name={adminFormFields.product.ogDescription}
            rows={3}
            defaultValue={defaults.og_description}
            maxLength={productContentLimits.og_description}
            className={`${adminFieldClass} min-h-20 resize-y`}
          />
          <span className={adminHelperClass}>
            Open Graph description. Празно → meta описание. Макс.{" "}
            {productContentLimits.og_description} символа.
          </span>
        </label>
      </div>

      <SeoResolvedPreview preview={resolvedPreview} className="mt-5 md:col-span-2" />
    </AdminSectionAccordion>
  );
}
