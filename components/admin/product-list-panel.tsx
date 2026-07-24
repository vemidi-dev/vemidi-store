import {
  deleteProduct,
  deleteProductGalleryImage,
  moveProductImage,
  publishProduct,
  setPrimaryProductImage,
  toggleProductSoldOut,
  updateProduct,
  updateProductImageAltText,
  updateProductMerchandising,
} from "@/app/admin/actions";
import { DUPLICATE_MISSING_IMAGES_NOTICE } from "@/lib/admin/duplicate-product";
import {
  productEditAnchorId,
  productGalleryAnchorId,
} from "@/lib/admin/product-edit-navigation";
import { getAdminProductPreviewPath } from "@/lib/admin/product-preview-path";
import {
  normalizeProductPublicationStatus,
  PRODUCT_PUBLICATION_STATUS_LABELS,
} from "@/lib/product-publication";
import { buildPromotionProductOptions } from "@/lib/promotion-admin";
import { AdminAutoOpenProductEdit } from "@/components/admin/admin-auto-open-product-edit";
import { AdminProductEditStickyActions } from "@/components/admin/admin-product-edit-sticky-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminUnsavedChangesGuard } from "@/components/admin/admin-unsaved-changes-guard";
import { ProductLandingPagesPanel } from "@/components/admin/product-landing-pages-panel";
import { ProductDuplicateButton } from "@/components/admin/product-duplicate-button";
import { AdminListControls } from "@/components/admin/admin-list-controls";
import { AdminLazyDetailsMount } from "@/components/admin/admin-lazy-details-mount";
import { AdminOpenDetailsButton } from "@/components/admin/admin-open-details-button";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { ProductGalleryAddForm } from "@/components/admin/product-gallery-add-form";
import { ProductGalleryReplaceForm } from "@/components/admin/product-gallery-replace-form";
import { ProductImageFileInput } from "@/components/admin/product-image-file-input";
import { ProductFulfillmentFields } from "@/components/admin/product-fulfillment-fields";
import { ProductVisibilityField } from "@/components/admin/product-visibility-field";
import { ProductCardBadgeField } from "@/components/admin/product-card-badge-field";
import { ProductUpsellOffersEditor } from "@/components/admin/product-upsell-offers-editor";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import { ProductOptionGroupsEditor } from "@/components/admin/product-option-groups-editor";
import { ProductPersonalizationFieldsEditor } from "@/components/admin/product-personalization-fields-editor";
import { ProductPublicationBadge } from "@/components/admin/product-publication-badge";
import { ProductPublicationStatusField } from "@/components/admin/product-publication-status-field";
import { ProductMerchandisingFields } from "@/components/admin/product-merchandising-fields";
import { ProductContentSeoFields } from "@/components/admin/product-content-seo-fields";
import { ProductPageContentFields } from "@/components/admin/product-page-content-fields";
import { ProductSeoFields } from "@/components/admin/product-seo-fields";
import {
  getCategoryDisplayLabel,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import { ProductWishSelector } from "@/components/admin/product-wish-selector";
import { ProductFaqFields } from "@/components/admin/product-faq-fields";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import type { AdminData } from "@/lib/admin/data";
import { buildDependencyOptionsFromGroups } from "@/lib/admin/option-dependency-options";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";
import { formatAdminFulfillmentListStatus } from "@/lib/product-fulfillment";

const productCardClass =
  "group/product rounded-xl border border-boutique-line bg-white shadow-boutique-sm transition hover:border-boutique-sage/25 hover:shadow-md has-[details[open]]:border-boutique-sage/35 has-[details[open]]:shadow-md";

const productHeaderClass =
  "flex flex-col gap-3 rounded-t-xl border-b border-boutique-line/60 bg-boutique-bg/55 px-3 py-3 lg:flex-row lg:items-center";

const productSectionClass =
  "border-t border-boutique-line/60 bg-white open:bg-boutique-bg/25";

const productSectionSummaryClass =
  "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-boutique-ink outline-none transition hover:bg-boutique-bg/50 open:bg-boutique-bg/40 open:text-boutique-sage-deep focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-boutique-accent/25 [&::-webkit-details-marker]:hidden";

const actionPrimaryClass =
  "rounded-lg bg-boutique-ink px-3 py-1.5 text-xs font-semibold text-boutique-paper transition hover:bg-boutique-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30";

const actionSecondaryClass =
  "rounded-lg px-2.5 py-1.5 text-xs font-medium text-boutique-muted transition hover:bg-white hover:text-boutique-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/20";

const actionDangerClass =
  "rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600/90 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200";

const categoryChipClass =
  "inline-flex max-w-[10rem] truncate rounded-full border border-boutique-line/80 bg-white px-2 py-0.5 text-[10px] font-medium text-boutique-muted";

function ProductThumbnail({
  thumbnailUrl,
  productName,
}: {
  thumbnailUrl: string | null | undefined;
  productName: string;
}) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-boutique-line bg-white shadow-sm">
      {thumbnailUrl ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          role="img"
          aria-label={productName}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-[9px] text-boutique-muted">
          вЂ”
        </div>
      )}
    </div>
  );
}

function ProductStatusBadge({
  soldOut,
  fulfillmentStatus,
}: {
  soldOut: boolean;
  fulfillmentStatus: string;
}) {
  if (soldOut) {
    return (
      <span
        className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800"
        title={fulfillmentStatus}
      >
        РР·С‡РµСЂРїР°РЅ
      </span>
    );
  }

  return (
    <span
      className="inline-flex rounded-full bg-boutique-sage/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-sage-deep"
      title={fulfillmentStatus}
    >
      {fulfillmentStatus}
    </span>
  );
}

export function ProductListPanel({
  data,
  editProductId,
}: {
  data: AdminData;
  editProductId?: string;
}) {
  const {
    products,
    categories,
    colorGroups,
    colorOptions,
    categoryById,
    categoryIdsByProductId,
    colorFieldsByProductId,
    selectedColorOptionIdsByFieldId,
    imagesByProductId,
    personalizationFieldsByProductId,
    wishTemplates,
    wishTemplateOccasions,
    wishTemplateIdsByProductId,
    faqProductGroups,
    faqItems,
    faqGroupIdsByProductId,
    faqItemIdsByProductId,
    featuredProductById,
    relatedProductIdsByProductId,
    upsellOffersByProductId,
    upsellSettingsByProductId,
    optionGroupsByProductId,
    optionValuesByGroupId,
    landingPagesByProductId,
    landingPagesMigrationMissing,
  } = data;

  const occasionCategories = categories.filter(
    (category) => category.category_type === "occasion",
  );
  const materialCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "material"),
  );
  const productCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "product"),
  );
  const relatedProductPickerProducts = buildPromotionProductOptions(
    products,
    categories.map((category) => ({
      id: category.id,
      name: category.name,
      category_type: category.category_type,
    })),
    products.flatMap((entry) =>
      (categoryIdsByProductId.get(entry.id) ?? []).map((categoryId) => ({
        product_id: entry.id,
        category_id: categoryId,
      })),
    ),
  );
  const relatedProductPickerCategories = categories.map((category) => ({
    id: category.id,
    name:
      category.category_type === "product"
        ? getCategoryDisplayLabel(categories, category)
        : category.name,
    categoryType: category.category_type,
  }));

  return (
    <article className={adminPanelClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-boutique-ink">Р’СЃРёС‡РєРё РїСЂРѕРґСѓРєС‚Рё</h2>
          <p className="mt-1 text-sm text-boutique-muted">
            {products.length} РїСЂРѕРґСѓРєС‚Р° В· РєРѕРјРїР°РєС‚РµРЅ СЃРїРёСЃСЉРє СЃ С‚СЉСЂСЃРµРЅРµ, С„РёР»С‚СЂРё Рё РїР°РіРёРЅР°С†РёСЏ
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">РќСЏРјР° РґРѕР±Р°РІРµРЅРё РїСЂРѕРґСѓРєС‚Рё.</p>
      ) : (
        <>
          <AdminListControls
            containerId="admin-product-list"
            itemSelector="[data-admin-product]"
            total={products.length}
            searchPlaceholder="РРјРµ, РєР°С‚РµРіРѕСЂРёСЏ РёР»Рё С†РµРЅР°..."
            filters={[
              {
                key: "availability",
                label: "РќР°Р»РёС‡РЅРѕСЃС‚",
                dataAttribute: "filterStatus",
                options: [
                  { value: "active", label: "РђРєС‚РёРІРЅРё" },
                  { value: "sold-out", label: "РР·С‡РµСЂРїР°РЅРё" },
                  { value: "featured", label: "РќР° РЅР°С‡Р°Р»РЅР°С‚Р°" },
                  { value: "customizable", label: "РЎ РїРµСЂСЃРѕРЅР°Р»РёР·Р°С†РёСЏ" },
                ],
              },
              {
                key: "publication",
                label: "РЎС‚Р°С‚СѓСЃ",
                dataAttribute: "publicationStatus",
                options: [
                  { value: "draft", label: PRODUCT_PUBLICATION_STATUS_LABELS.draft },
                  {
                    value: "published",
                    label: PRODUCT_PUBLICATION_STATUS_LABELS.published,
                  },
                  {
                    value: "archived",
                    label: PRODUCT_PUBLICATION_STATUS_LABELS.archived,
                  },
                ],
              },
              {
                key: "product",
                label: "РљР°С‚РµРіРѕСЂРёСЏ",
                dataAttribute: "productCats",
                options: productCategories.map((category) => ({
                  value: category.id,
                  label: getCategoryDisplayLabel(categories, category),
                })),
              },
              {
                key: "occasion",
                label: "РџРѕРІРѕРґ",
                dataAttribute: "occasionCats",
                options: occasionCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              },
            ]}
            sortOptions={[
              { value: "order-desc", label: "РќР°Р№-РЅРѕРІРё", attribute: "sortIndex", direction: "desc" },
              { value: "order-asc", label: "РќР°Р№-СЃС‚Р°СЂРё", attribute: "sortIndex", direction: "asc" },
              { value: "name-asc", label: "РРјРµ РђвЂ“РЇ", attribute: "sortName", direction: "asc" },
              { value: "name-desc", label: "РРјРµ РЇвЂ“Рђ", attribute: "sortName", direction: "desc" },
              { value: "price-asc", label: "Р¦РµРЅР° в†‘", attribute: "sortPrice", direction: "asc" },
              { value: "price-desc", label: "Р¦РµРЅР° в†“", attribute: "sortPrice", direction: "desc" },
            ]}
            defaultSort="order-desc"
            pageSize={30}
            sticky
          />

          <div id="admin-product-list" className="mt-4 space-y-3">
          {products.map((product, productIndex) => {
            const assignedIds = categoryIdsByProductId.get(product.id) ?? [];
            const assignedCategories = assignedIds
              .map((categoryId) => categoryById.get(categoryId))
              .filter((category): category is CategoryRow => category !== undefined);
            const fields = (colorFieldsByProductId.get(product.id) ?? []).filter(
              (field) => field.enabled,
            );
            const initialColorFields = fields.map((field) => ({
              label: field.label,
              groupId: field.group_id,
              minSelect: field.min_select,
              maxSelect: field.max_select,
              optionIds: [
                ...(selectedColorOptionIdsByFieldId.get(field.id) ?? new Set<string>()),
              ],
              selectionMode:
                field.selection_mode === "quantity" ? ("quantity" as const) : ("choice" as const),
              requiredTotalQuantity:
                field.selection_mode === "quantity"
                  ? field.required_total_quantity ?? null
                  : null,
            }));
            const productImages = imagesByProductId.get(product.id) ?? [];
            const storedPersonalizationFields =
              personalizationFieldsByProductId.get(product.id) ?? [];
            const initialPersonalizationFields =
              storedPersonalizationFields.length > 0
                ? storedPersonalizationFields.map((field) => ({
                    label: field.label,
                    key: field.field_key,
                    type: field.field_type,
                    placeholder: field.placeholder ?? "",
                    maxLength: field.max_length,
                    priceDelta: Number(field.price_delta) || 0,
                    required: field.is_required,
                    allowsWishTemplates: field.allows_wish_templates,
                  }))
                : product.is_customizable
                  ? [
                      {
                        label: "РўРµРєСЃС‚ Р·Р° РїРµСЂСЃРѕРЅР°Р»РёР·Р°С†РёСЏ",
                        key: "personalization",
                        type: "textarea" as const,
                        placeholder: "Р’СЉРІРµРґРµС‚Рµ Р¶РµР»Р°РЅРёСЏ С‚РµРєСЃС‚",
                        maxLength: 1000,
                        priceDelta: 0,
                        required: false,
                        allowsWishTemplates: true,
                      },
                    ]
                  : [];

            const storedOptionGroups = optionGroupsByProductId.get(product.id) ?? [];
            const initialOptionGroups = storedOptionGroups.map((group) => ({
              id: group.id,
              name: group.name,
              key: group.key,
              inputType: group.input_type,
              isRequired: group.is_required,
              minSelect: group.min_select,
              maxSelect: group.max_select,
              sortOrder: group.sort_order,
              isActive: group.is_active,
              pricingMode: "delta" as const,
              dependsOnOptionId: group.depends_on_option_id,
              placeholder: group.placeholder,
              maxLength: group.max_length,
              textPriceDelta: Number(group.text_price_delta) || 0,
              values: (optionValuesByGroupId.get(group.id) ?? []).map((value) => ({
                id: value.id,
                label: value.label,
                key: value.key,
                priceDelta: Number(value.price_delta) || 0,
                isDefault: value.is_default,
                isActive: value.is_active,
                isSoldOut: value.is_sold_out,
                imageUrl: value.image_url,
                sku: value.sku,
                sortOrder: value.sort_order,
              })),
            }));
            const productDependencyOptions =
              buildDependencyOptionsFromGroups(initialOptionGroups).filter(
                (option) => /^[0-9a-f-]{36}$/i.test(option.id),
              );

            const productCategoryIds = assignedCategories
              .filter((category) => category.category_type === "product")
              .map((category) => category.id);
            const primaryCategoryId =
              product.primary_category_id && productCategoryIds.includes(product.primary_category_id)
                ? product.primary_category_id
                : productCategoryIds[0] ?? null;
            const productCategoryFilterIds = Array.from(
              new Set([
                ...productCategoryIds,
                ...assignedCategories.flatMap((category) =>
                  category.category_type === "product" && category.parent_id
                    ? [category.parent_id]
                    : [],
                ),
              ]),
            );
            const occasionCategoryIds = assignedCategories
              .filter((category) => category.category_type === "occasion")
              .map((category) => category.id);
            const galleryImageCount =
              productImages.length > 0
                ? productImages.length
                : product.image_url
                  ? 1
                  : 0;
            const hasNoGalleryImages = galleryImageCount === 0;
            const thumbnailUrl =
              productImages.find((image) => image.is_primary)?.image_url ??
              productImages[0]?.image_url ??
              product.image_url;

            const fulfillmentStatus = formatAdminFulfillmentListStatus({
              soldOut: product.is_sold_out,
              fulfillmentType: product.fulfillment_type,
              stockQuantity: product.stock_quantity ?? null,
            });

            const productTypeCategories = assignedCategories.filter(
              (category) => category.category_type === "product",
            );
            const occasionTypeCategories = assignedCategories.filter(
              (category) => category.category_type === "occasion",
            );
            const publicationStatus = normalizeProductPublicationStatus(
              product.status,
              "published",
            );

            return (
              <article
                key={product.id}
                id={productEditAnchorId(product.id)}
                data-admin-product
                data-search={`${product.name} ${product.price} ${assignedCategories
                  .map((category) => category.name)
                  .join(" ")}`}
                data-filter-status={[
                  product.is_sold_out ? "sold-out" : "active",
                  featuredProductById.has(product.id) ? "featured" : "",
                  product.is_customizable ? "customizable" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-publication-status={publicationStatus}
                data-product-cats={productCategoryFilterIds.join(" ")}
                data-occasion-cats={occasionCategoryIds.join(" ")}
                data-sort-name={product.name}
                data-sort-price={product.price}
                data-sort-index={productIndex}
                className={productCardClass}
              >
                <header className={productHeaderClass}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ProductThumbnail
                      thumbnailUrl={thumbnailUrl}
                      productName={product.name}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-boutique-ink">{product.name}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <ProductStatusBadge
                          soldOut={product.is_sold_out}
                          fulfillmentStatus={fulfillmentStatus}
                        />
                        <ProductPublicationBadge status={publicationStatus} />
                        {featuredProductById.has(product.id) ? (
                          <span className="inline-flex rounded-full bg-boutique-warm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-ink">
                            РќР° РЅР°С‡Р°Р»РЅР°С‚Р°
                          </span>
                        ) : null}
                        {product.is_customizable ? (
                          <span className="inline-flex rounded-full bg-boutique-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                            РџРµСЂСЃРѕРЅР°Р»РёР·Р°С†РёСЏ
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {productTypeCategories.length === 0 && occasionTypeCategories.length === 0 ? (
                          <span className={categoryChipClass}>Р‘РµР· РєР°С‚РµРіРѕСЂРёСЏ</span>
                        ) : (
                          <>
                            {productTypeCategories.map((category) => (
                              <span
                                key={`${product.id}-product-cat-${category.id}`}
                                className={categoryChipClass}
                                title={category.name}
                              >
                                {category.name}
                              </span>
                            ))}
                            {occasionTypeCategories.map((category) => (
                              <span
                                key={`${product.id}-occasion-cat-${category.id}`}
                                className={`${categoryChipClass} border-boutique-sage/25 bg-boutique-sage/10 text-boutique-sage-deep`}
                                title={category.name}
                              >
                                {category.name}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end lg:min-w-[5.5rem]">
                    <p className="text-sm font-semibold text-boutique-ink">
                      {Number(product.price).toFixed(2)} в‚¬
                    </p>
                  </div>

                  <div
                    className="flex w-full flex-wrap items-center gap-1 border-t border-boutique-line/50 pt-2 lg:w-auto lg:border-t-0 lg:pt-0"
                    role="group"
                    aria-label={`Р”РµР№СЃС‚РІРёСЏ Р·Р° ${product.name}`}
                  >
                    <AdminOpenDetailsButton
                      detailsId={`product-edit-${product.id}`}
                      className={actionPrimaryClass}
                    >
                      Р РµРґР°РєС†РёСЏ
                    </AdminOpenDetailsButton>
                    <a
                      href={getAdminProductPreviewPath(product.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionSecondaryClass}
                    >
                      РџСЂРµРіР»РµРґ
                    </a>
                    {publicationStatus === "draft" ? (
                      <form action={publishProduct} className="inline">
                        <input
                          type="hidden"
                          name={adminFormFields.common.id}
                          value={product.id}
                        />
                        <button type="submit" className={actionSecondaryClass}>
                          РџСѓР±Р»РёРєСѓРІР°РЅРµ
                        </button>
                      </form>
                    ) : null}
                    <ProductDuplicateButton
                      productId={product.id}
                      productName={product.name}
                      className={`${actionSecondaryClass} disabled:opacity-60`}
                    />
                    <form action={toggleProductSoldOut} className="inline">
                      <input type="hidden" name={adminFormFields.common.tab} value="products" />
                      <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                      <input
                        type="hidden"
                        name="sold_out_target"
                        value={product.is_sold_out ? "false" : "true"}
                      />
                      <button type="submit" className={actionSecondaryClass}>
                        {product.is_sold_out ? "РђРєС‚РёРІРёСЂР°Р№" : "РР·С‡РµСЂРїР°РЅ"}
                      </button>
                    </form>
                    <AdminConfirmForm
                      action={deleteProduct}
                      confirmMessage={`РЎРёРіСѓСЂРЅРё Р»Рё СЃС‚Рµ, С‡Рµ РёСЃРєР°С‚Рµ РґР° РёР·С‚СЂРёРµС‚Рµ вЂћ${product.name}"?`}
                      className="inline"
                    >
                      <input type="hidden" name={adminFormFields.common.tab} value="products" />
                      <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                      <button type="submit" className={actionDangerClass}>
                        РР·С‚СЂРёР№
                      </button>
                    </AdminConfirmForm>
                  </div>
                </header>

                <AdminLazyDetailsMount
                  id={`product-edit-${product.id}`}
                  className={productSectionClass}
                  summaryClassName={productSectionSummaryClass}
                  contentClassName="border-t border-boutique-line/50 px-3 py-4 pb-20 sm:px-4"
                  summary={
                    <>
                      <span>Р РµРґР°РєС‚РёСЂР°Р№ РїСЂРѕРґСѓРєС‚</span>
                      <span className="text-xs font-normal text-boutique-muted" aria-hidden>
                        Р¤РѕСЂРјР°
                      </span>
                    </>
                  }
                >
                  <form
                    id={`admin-edit-product-form-${product.id}`}
                    action={updateProduct}
                    className="mt-4 grid gap-4 md:grid-cols-2"
                  >
                    <AdminUnsavedChangesGuard
                      formId={`admin-edit-product-form-${product.id}`}
                    />
                    <input type="hidden" name={adminFormFields.common.tab} value="products" />
                    <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                    <input
                      type="hidden"
                      name={adminFormFields.product.existingImageUrl}
                      value={product.image_url ?? ""}
                    />

                    <label className="text-sm font-medium text-boutique-ink">
                      РРјРµ
                      <input
                        name={adminFormFields.product.name}
                        defaultValue={product.name}
                        required
                        className={adminFieldClass}
                      />
                    </label>
                    <label className="text-sm font-medium text-boutique-ink">
                      РћСЃРЅРѕРІРЅР° С†РµРЅР° / С†РµРЅР° РЅР° РЅР°Р№-РµРІС‚РёРЅРёСЏ РІР°СЂРёР°РЅС‚ (РµРІСЂРѕ)
                      <input
                        name={adminFormFields.product.price}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={product.price}
                        required
                        className={adminFieldClass}
                      />
                    </label>
                    <ProductPublicationStatusField
                      defaultValue={publicationStatus}
                      fieldClassName={adminFieldClass}
                      helperClassName={adminHelperClass}
                    />
                    <div className="md:col-span-2">
                      <fieldset className="space-y-4 rounded-lg border border-boutique-line/70 bg-boutique-bg/40 p-4">
                        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                          РЎСЉРґСЉСЂР¶Р°РЅРёРµ РЅР° РїСЂРѕРґСѓРєС‚РѕРІР°С‚Р° СЃС‚СЂР°РЅРёС†Р°
                        </legend>
                        <ProductPageContentFields
                          defaults={{
                            headingSubtitle: product.heading_subtitle ?? "",
                            subtitle: product.subtitle ?? "",
                            description: product.description ?? "",
                            additionalInfo: product.additional_info ?? "",
                            personalization_info: product.personalization_info ?? "",
                            dimensions_materials: product.dimensions_materials ?? "",
                            ordering_info: product.ordering_info ?? "",
                          }}
                          fieldClassName={adminFieldClass}
                          helperClassName={adminHelperClass}
                        />
                      </fieldset>
                    </div>

                    <div className="md:col-span-2">
                      <ProductSeoFields
                        initialSlug={product.slug}
                        productCode={product.product_code}
                        mode="edit"
                        helperClassName={adminHelperClass}
                        fieldClassName={adminFieldClass}
                      />
                      <ProductContentSeoFields product={product} />
                    </div>

                    <fieldset className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        РљР°С‚РµРіРѕСЂРёРё
                      </legend>
                      {categories.length === 0 ? (
                        <p className={adminHelperClass}>РќСЏРјР° РЅР°Р»РёС‡РЅРё РєР°С‚РµРіРѕСЂРёРё.</p>
                      ) : (
                        <div className="mt-2 space-y-4">
                          {([
                            ["product", productCategories],
                            ["occasion", occasionCategories],
                            ["material", materialCategories],
                          ] as const).map(([categoryType, groupedCategories]) => (
                            <div key={categoryType}>
                              <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                                {categoryType === "product" ? "Продукти" : categoryType === "material" ? "Заготовки и материали" : "Поводи"}
                              </p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {groupedCategories
                                  .map((category) => (
                                    <div
                                      key={`${product.id}-${category.id}-edit`}
                                      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-boutique-ink"
                                    >
                                      <label className="inline-flex min-w-0 items-center gap-2">
                                        <input
                                          name={adminFormFields.product.categoryIds}
                                          type="checkbox"
                                          value={category.id}
                                          defaultChecked={assignedIds.includes(category.id)}
                                          className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                                        />
                                        {getCategoryDisplayLabel(categories, category)}
                                      </label>
                                      {category.category_type === "product" ? (
                                        <label
                                          className="inline-flex shrink-0 items-center gap-1 text-xs text-boutique-muted"
                                          title="РћСЃРЅРѕРІРЅР° РєР°С‚РµРіРѕСЂРёСЏ Р·Р° breadcrumb Рё SEO"
                                        >
                                          <input
                                            name={adminFormFields.product.primaryCategoryId}
                                            type="radio"
                                            value={category.id}
                                            defaultChecked={primaryCategoryId === category.id}
                                            aria-label={`РћСЃРЅРѕРІРЅР° Р·Р° SEO: ${getCategoryDisplayLabel(categories, category)}`}
                                            className="h-3.5 w-3.5 border-boutique-line text-boutique-accent"
                                          />
                                          РћСЃРЅРѕРІРЅР°
                                        </label>
                                      ) : null}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className={`${adminHelperClass} mt-2`}>
                        РћС‚РјРµС‚РЅРµС‚Рµ РєР°С‚РµРіРѕСЂРёРёС‚Рµ РЅР° РїСЂРѕРґСѓРєС‚Р°. РџСЂРё РїСЂРѕРґСѓРєС‚РѕРІРёС‚Рµ РєР°С‚РµРіРѕСЂРёРё РјР°СЂРєРёСЂР°Р№С‚Рµ
                        РµРґРЅР° РєР°С‚РµРіРѕСЂРёСЏ РєР°С‚Рѕ вЂћРћСЃРЅРѕРІРЅР°вЂњ Р·Р° breadcrumb Рё SEO.
                      </p>
                    </fieldset>

                    <AdminLazyDetailsMount
                      id={`product-edit-${product.id}-options`}
                      className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2"
                      summary={
                        <span className="cursor-pointer px-1 text-sm font-medium text-boutique-ink">
                          РћРїС†РёРё Рё С†РµРЅРѕРѕР±СЂР°Р·СѓРІР°РЅРµ
                        </span>
                      }
                      contentClassName="mt-3"
                      initiallyMounted
                    >
                      <ProductOptionGroupsEditor
                        initialGroups={initialOptionGroups}
                        allDependencyOptions={productDependencyOptions}
                        productImages={[
                          ...new Map(
                            [
                              ...productImages.map((image, imageIndex) => [
                                image.image_url,
                                {
                                  src: image.image_url,
                                  label: [
                                    `РЎРЅРёРјРєР° ${imageIndex + 1}`,
                                    image.is_primary ? "(РѕСЃРЅРѕРІРЅР°)" : "",
                                    image.alt_text ? `- ${image.alt_text}` : "",
                                  ].filter(Boolean).join(" "),
                                },
                              ] as const),
                              ...(product.image_url
                                ? [[
                                    product.image_url,
                                    { src: product.image_url, label: "РћСЃРЅРѕРІРЅР° СЃРЅРёРјРєР°" },
                                  ] as const]
                                : []),
                            ].filter(([src]) => Boolean(src)),
                          ).values(),
                        ]}
                        basePrice={Number(product.price) || 0}
                        helperClassName={adminHelperClass}
                        fieldClassName={adminFieldClass}
                      />
                    </AdminLazyDetailsMount>

                    <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        Р¦РІРµС‚РѕРІРё РЅР°СЃС‚СЂРѕР№РєРё
                      </legend>
                      <ProductColorFieldsEditor
                        colorGroups={colorGroups}
                        colorOptions={colorOptions}
                        initialFields={initialColorFields}
                        helperClassName={adminHelperClass}
                        fieldClassName={adminFieldClass}
                      />
                    </fieldset>

                    <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        РџРµСЂСЃРѕРЅР°Р»РёР·Р°С†РёСЏ
                      </legend>
                      <ProductPersonalizationFieldsEditor
                        initialFields={initialPersonalizationFields}
                        helperClassName={adminHelperClass}
                        fieldClassName={adminFieldClass}
                      />
                    </fieldset>
                    <AdminLazyDetailsMount
                      id={`product-edit-${product.id}-wishes`}
                      className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2"
                      summary={
                        <span className="cursor-pointer px-1 text-sm font-medium text-boutique-ink">
                          РџРѕРґС…РѕРґСЏС‰Рё РіРѕС‚РѕРІРё РїРѕР¶РµР»Р°РЅРёСЏ
                        </span>
                      }
                      contentClassName="mt-3"
                      initiallyMounted
                    >
                      <ProductWishSelector
                        wishes={wishTemplates}
                        occasions={occasionCategories}
                        wishOccasionLinks={wishTemplateOccasions}
                        selectedIds={
                          wishTemplateIdsByProductId.get(product.id) ?? []
                        }
                        helperClassName={adminHelperClass}
                      />
                    </AdminLazyDetailsMount>
                    <AdminLazyDetailsMount
                      id={`product-edit-${product.id}-upsells`}
                      className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2"
                      summary={
                        <span className="cursor-pointer px-1 text-sm font-medium text-boutique-ink">
                          Upsell РїСЂРµРґР»РѕР¶РµРЅРёСЏ
                        </span>
                      }
                      contentClassName="mt-3"
                      initiallyMounted
                    >
                      <ProductUpsellOffersEditor
                        sourceProductId={product.id}
                        products={products}
                        offers={upsellOffersByProductId.get(product.id) ?? []}
                        sectionTitle={
                          upsellSettingsByProductId.get(product.id)?.section_title ?? ""
                        }
                        helperClassName={adminHelperClass}
                        fieldClassName={adminFieldClass}
                      />
                    </AdminLazyDetailsMount>
                    <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        Р’СЉРїСЂРѕСЃРё Рё РѕС‚РіРѕРІРѕСЂРё
                      </legend>
                      <ProductFaqFields
                        productGroups={faqProductGroups}
                        items={faqItems}
                        selectedGroupIds={faqGroupIdsByProductId.get(product.id) ?? []}
                        selectedItemIds={faqItemIdsByProductId.get(product.id) ?? []}
                        helperClassName={adminHelperClass}
                      />
                    </fieldset>
                    <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                      Р‘РµР»РµР¶РєР° Р·Р° РґРѕСЃС‚Р°РІРєР°/РёР·СЂР°Р±РѕС‚РєР°
                      <textarea
                        name={adminFormFields.product.fulfillmentNote}
                        rows={2}
                        defaultValue={product.fulfillment_note ?? ""}
                        className={`${adminFieldClass} resize-y`}
                      />
                    </label>

                    <div className="md:col-span-2">
                      <ProductCardBadgeField defaultValue={product.card_badge} />
                    </div>

                    <div className="md:col-span-2">
                      <ProductVisibilityField
                        defaultValue={product.visibility}
                        fieldClassName={adminFieldClass}
                        helperClassName={adminHelperClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <ProductFulfillmentFields
                        initialFulfillmentType={product.fulfillment_type ?? "made_to_order"}
                        initialStockQuantity={product.stock_quantity ?? null}
                      />
                    </div>

                    {hasNoGalleryImages ? (
                      <div className="md:col-span-2">
                        <ProductImageFileInput
                          name={adminFormFields.product.imageFiles}
                          altTextName={adminFormFields.product.imageAltTexts}
                          label="РЎРЅРёРјРєРё РЅР° РїСЂРѕРґСѓРєС‚Р°"
                          className={adminFieldClass}
                          helperClassName={adminHelperClass}
                          existingGalleryCount={galleryImageCount}
                          helperText="РР·Р±РµСЂРµС‚Рµ СЃРЅРёРјРєРё Рё РЅР°С‚РёСЃРЅРµС‚Рµ вЂћР—Р°РїР°Р·Рё РїСЂРѕРјРµРЅРёС‚РµвЂњ. PNG, JPG РёР»Рё WEBP вЂ” РѕРїС‚РёРјРёР·РёСЂР°С‚ СЃРµ Р°РІС‚РѕРјР°С‚РёС‡РЅРѕ."
                        />
                      </div>
                    ) : null}

                    <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink md:col-span-2">
                      <input
                        name={adminFormFields.product.isSoldOut}
                        type="checkbox"
                        defaultChecked={product.is_sold_out}
                        className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                      />
                      РР·С‡РµСЂРїР°РЅ
                    </label>

                    <div className="md:col-span-2">
                      <AdminFormPendingGuard
                        message={
                          hasNoGalleryImages
                            ? "Р—Р°РїР°Р·РІР°РЅРµ Рё РєР°С‡РІР°РЅРµ РЅР° СЃРЅРёРјРєРёвЂ¦ РњРѕР»СЏ, РЅРµ Р·Р°С‚РІР°СЂСЏР№С‚Рµ СЃС‚СЂР°РЅРёС†Р°С‚Р°."
                            : undefined
                        }
                      />
                    </div>
                  </form>

                  <AdminConfirmForm
                    action={deleteProduct}
                    confirmMessage={`РЎРёРіСѓСЂРЅРё Р»Рё СЃС‚Рµ, С‡Рµ РёСЃРєР°С‚Рµ РґР° РёР·С‚СЂРёРµС‚Рµ вЂћ${product.name}"?`}
                    className="mt-5 border-t border-red-100 pt-4"
                  >
                    <input type="hidden" name={adminFormFields.common.tab} value="products" />
                    <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
                    >
                      РР·С‚СЂРёР№ РїСЂРѕРґСѓРєС‚Р°
                    </button>
                  </AdminConfirmForm>

                  <ProductLandingPagesPanel
                    productId={product.id}
                    productSlug={product.slug}
                    landingPages={landingPagesByProductId.get(product.id) ?? []}
                    migrationMissing={landingPagesMigrationMissing}
                  />

                  <section
                    id={productGalleryAnchorId(product.id)}
                    className="mt-5 border-t border-boutique-line/70 pt-5"
                  >
                    <div>
                      <h4 className="font-semibold text-boutique-ink">Р“Р°Р»РµСЂРёСЏ</h4>
                      <p className="mt-1 text-xs text-boutique-muted">
                        Р”РѕР±Р°РІСЏР№С‚Рµ, Р·Р°РјРµРЅСЏР№С‚Рµ РёР»Рё РёР·С‚СЂРёРІР°Р№С‚Рµ РѕС‚РґРµР»РЅРё СЃРЅРёРјРєРё. РџСЂРѕРјСЏРЅР°С‚Р° РЅР°
                        РЅР°СЃС‚СЂРѕР№РєРёС‚Рµ РЅР° РїСЂРѕРґСѓРєС‚Р° РЅРµ Р·Р°СЃСЏРіР° РіР°Р»РµСЂРёСЏС‚Р°.
                      </p>
                    </div>

                    {hasNoGalleryImages ? (
                      <p
                        role="status"
                        className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                      >
                        {DUPLICATE_MISSING_IMAGES_NOTICE} Р”РѕР±Р°РІРµС‚Рµ СЃРЅРёРјРєРё РѕС‚ С„РѕСЂРјР°С‚Р° РїРѕ-РґРѕР»Сѓ.
                      </p>
                    ) : null}

                    <ProductGalleryAddForm
                      productId={product.id}
                      productName={product.name}
                      existingGalleryCount={galleryImageCount}
                    />

                    {productImages.length > 0 ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {productImages.map((image, index) => (
                          <article
                            key={image.id}
                            className="rounded-xl border border-boutique-line bg-white p-3"
                          >
                            <div
                              className="aspect-[4/3] rounded-lg bg-cover bg-center"
                              style={{ backgroundImage: `url(${image.image_url})` }}
                              role="img"
                              aria-label={image.alt_text || product.name}
                            />
                            <div className="mt-3 flex items-center justify-between gap-2">
                              <span className="text-xs text-boutique-muted">
                                РЎРЅРёРјРєР° {index + 1}
                              </span>
                              {image.is_primary ? (
                                <span className="rounded-full bg-boutique-warm px-2 py-1 text-[0.65rem] font-semibold text-boutique-ink">
                                  РћСЃРЅРѕРІРЅР°
                                </span>
                              ) : (
                                <form action={setPrimaryProductImage}>
                                  <input
                                    type="hidden"
                                    name={adminFormFields.productImage.imageId}
                                    value={image.id}
                                  />
                                  <button className="text-xs font-semibold text-boutique-sage-deep">
                                    РќР°РїСЂР°РІРё РѕСЃРЅРѕРІРЅР°
                                  </button>
                                </form>
                              )}
                            </div>
                            <form action={updateProductImageAltText} className="mt-3 space-y-2">
                              <input
                                type="hidden"
                                name={adminFormFields.productImage.imageId}
                                value={image.id}
                              />
                              <label className="block text-xs font-medium text-boutique-ink">
                                Alt С‚РµРєСЃС‚
                                <input
                                  name={adminFormFields.productImage.altText}
                                  type="text"
                                  maxLength={160}
                                  defaultValue={image.alt_text ?? ""}
                                  placeholder="РљСЂР°С‚РєРѕ РѕРїРёСЃР°РЅРёРµ РЅР° СЃРЅРёРјРєР°С‚Р°"
                                  className={`${adminFieldClass} mt-1 text-xs`}
                                />
                              </label>
                              <button className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/50">
                                Р—Р°РїР°Р·Рё alt
                              </button>
                            </form>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <form action={moveProductImage}>
                                <input
                                  type="hidden"
                                  name={adminFormFields.productImage.imageId}
                                  value={image.id}
                                />
                                <input
                                  type="hidden"
                                  name={adminFormFields.productImage.direction}
                                  value="up"
                                />
                                <button
                                  disabled={index === 0}
                                  className="rounded-full border border-boutique-line px-3 py-1.5 text-xs disabled:opacity-35"
                                >
                                  РќР°Р»СЏРІРѕ
                                </button>
                              </form>
                              <form action={moveProductImage}>
                                <input
                                  type="hidden"
                                  name={adminFormFields.productImage.imageId}
                                  value={image.id}
                                />
                                <input
                                  type="hidden"
                                  name={adminFormFields.productImage.direction}
                                  value="down"
                                />
                                <button
                                  disabled={index === productImages.length - 1}
                                  className="rounded-full border border-boutique-line px-3 py-1.5 text-xs disabled:opacity-35"
                                >
                                  РќР°РґСЏСЃРЅРѕ
                                </button>
                              </form>
                              <form action={deleteProductGalleryImage}>
                                <input
                                  type="hidden"
                                  name={adminFormFields.productImage.imageId}
                                  value={image.id}
                                />
                                <button className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
                                  РР·С‚СЂРёР№
                                </button>
                              </form>
                            </div>
                            <ProductGalleryReplaceForm
                              productId={product.id}
                              imageId={image.id}
                            />
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>

                  <AdminProductEditStickyActions
                    formId={`admin-edit-product-form-${product.id}`}
                    detailsId={`product-edit-${product.id}`}
                    productAnchorId={productEditAnchorId(product.id)}
                    saveLabel={
                      hasNoGalleryImages ? "Р—Р°РїР°Р·Рё РїСЂРѕРјРµРЅРёС‚Рµ Рё РєР°С‡Рё" : "Р—Р°РїР°Р·Рё РїСЂРѕРјРµРЅРёС‚Рµ"
                    }
                    extraActions={
                      <>
                        <a
                          href={getAdminProductPreviewPath(product.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full border border-boutique-line bg-white px-4 py-2 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
                        >
                          РџСЂРµРіР»РµРґ
                        </a>
                        {publicationStatus === "draft" ? (
                          <form action={publishProduct} className="inline">
                            <input
                              type="hidden"
                              name={adminFormFields.common.id}
                              value={product.id}
                            />
                            <button
                              type="submit"
                              className="rounded-full border border-boutique-sage-deep/40 bg-boutique-sage/10 px-4 py-2 text-xs font-semibold text-boutique-sage-deep transition hover:border-boutique-sage-deep hover:bg-boutique-sage/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
                            >
                              РџСѓР±Р»РёРєСѓРІР°РЅРµ
                            </button>
                          </form>
                        ) : null}
                      </>
                    }
                  />
                </AdminLazyDetailsMount>

                <details className={productSectionClass}>
                  <summary className={productSectionSummaryClass}>
                    <span>Р’РёС‚СЂРёРЅР° Рё СЃРІСЉСЂР·Р°РЅРё РїСЂРѕРґСѓРєС‚Рё</span>
                    <span className="text-xs font-normal text-boutique-muted" aria-hidden>
                      Р’РёС‚СЂРёРЅР°
                    </span>
                  </summary>
                  <div className="border-t border-boutique-line/50 px-3 py-4 sm:px-4">
                  <form action={updateProductMerchandising}>
                    <input
                      type="hidden"
                      name={adminFormFields.common.id}
                      value={product.id}
                    />
                    <ProductMerchandisingFields
                      products={relatedProductPickerProducts}
                      categories={relatedProductPickerCategories}
                      excludeProductId={product.id}
                      selectedRelatedIds={
                        relatedProductIdsByProductId.get(product.id) ?? []
                      }
                      isFeatured={featuredProductById.has(product.id)}
                      homeSortOrder={
                        featuredProductById.get(product.id)?.sort_order ?? 0
                      }
                    />
                    <button
                      type="submit"
                      className="mt-4 rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                    >
                      Р—Р°РїР°Р·Рё РЅР°СЃС‚СЂРѕР№РєРёС‚Рµ
                    </button>
                  </form>
                  </div>
                </details>
              </article>
            );
          })}
          </div>
        </>
      )}
      <AdminAutoOpenProductEdit productId={editProductId} />
    </article>
  );
}
