import {
  deleteProduct,
  deleteProductGalleryImage,
  moveProductImage,
  setPrimaryProductImage,
  toggleProductSoldOut,
  updateProduct,
  updateProductImageAltText,
  updateProductMerchandising,
} from "@/app/admin/actions";
import { DUPLICATE_MISSING_IMAGES_NOTICE } from "@/lib/admin/duplicate-product";
import { AdminAutoOpenProductEdit } from "@/components/admin/admin-auto-open-product-edit";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { AdminUnsavedChangesGuard } from "@/components/admin/admin-unsaved-changes-guard";
import { ProductLandingPagesPanel } from "@/components/admin/product-landing-pages-panel";
import { ProductDuplicateButton } from "@/components/admin/product-duplicate-button";
import { AdminListControls } from "@/components/admin/admin-list-controls";
import { AdminOpenDetailsButton } from "@/components/admin/admin-open-details-button";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { ProductGalleryAddForm } from "@/components/admin/product-gallery-add-form";
import { ProductGalleryReplaceForm } from "@/components/admin/product-gallery-replace-form";
import { ProductImageFileInput } from "@/components/admin/product-image-file-input";
import { ProductFulfillmentFields } from "@/components/admin/product-fulfillment-fields";
import { ProductCardBadgeField } from "@/components/admin/product-card-badge-field";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import { ProductOptionGroupsEditor } from "@/components/admin/product-option-groups-editor";
import { ProductPersonalizationFieldsEditor } from "@/components/admin/product-personalization-fields-editor";
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
          —
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
        Изчерпан
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
    optionGroupsByProductId,
    optionValuesByGroupId,
    landingPagesByProductId,
    landingPagesMigrationMissing,
  } = data;

  const occasionCategories = categories.filter(
    (category) => category.category_type === "occasion",
  );
  const productCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "product"),
  );

  return (
    <article className={adminPanelClass}>
      <AdminAutoOpenProductEdit productId={editProductId} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-boutique-ink">Всички продукти</h2>
          <p className="mt-1 text-sm text-boutique-muted">
            {products.length} продукта · компактен списък с търсене, филтри и пагинация
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">Няма добавени продукти.</p>
      ) : (
        <>
          <AdminListControls
            containerId="admin-product-list"
            itemSelector="[data-admin-product]"
            total={products.length}
            searchPlaceholder="Име, категория или цена..."
            filters={[
              {
                key: "status",
                label: "Наличност",
                dataAttribute: "filterStatus",
                options: [
                  { value: "active", label: "Активни" },
                  { value: "sold-out", label: "Изчерпани" },
                  { value: "featured", label: "На началната" },
                  { value: "customizable", label: "С персонализация" },
                ],
              },
              {
                key: "product",
                label: "Категория",
                dataAttribute: "productCats",
                options: productCategories.map((category) => ({
                  value: category.id,
                  label: getCategoryDisplayLabel(categories, category),
                })),
              },
              {
                key: "occasion",
                label: "Повод",
                dataAttribute: "occasionCats",
                options: occasionCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              },
            ]}
            sortOptions={[
              { value: "order-desc", label: "Най-нови", attribute: "sortIndex", direction: "desc" },
              { value: "order-asc", label: "Най-стари", attribute: "sortIndex", direction: "asc" },
              { value: "name-asc", label: "Име А–Я", attribute: "sortName", direction: "asc" },
              { value: "name-desc", label: "Име Я–А", attribute: "sortName", direction: "desc" },
              { value: "price-asc", label: "Цена ↑", attribute: "sortPrice", direction: "asc" },
              { value: "price-desc", label: "Цена ↓", attribute: "sortPrice", direction: "desc" },
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
                    priceDelta: field.price_delta,
                    required: field.is_required,
                    allowsWishTemplates: field.allows_wish_templates,
                  }))
                : product.is_customizable
                  ? [
                      {
                        label: "Текст за персонализация",
                        key: "personalization",
                        type: "textarea" as const,
                        placeholder: "Въведете желания текст",
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

            return (
              <article
                key={product.id}
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
                        {featuredProductById.has(product.id) ? (
                          <span className="inline-flex rounded-full bg-boutique-warm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-ink">
                            На началната
                          </span>
                        ) : null}
                        {product.is_customizable ? (
                          <span className="inline-flex rounded-full bg-boutique-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                            Персонализация
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {productTypeCategories.length === 0 && occasionTypeCategories.length === 0 ? (
                          <span className={categoryChipClass}>Без категория</span>
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
                      {Number(product.price).toFixed(2)} €
                    </p>
                  </div>

                  <div
                    className="flex w-full flex-wrap items-center gap-1 border-t border-boutique-line/50 pt-2 lg:w-auto lg:border-t-0 lg:pt-0"
                    role="group"
                    aria-label={`Действия за ${product.name}`}
                  >
                    <AdminOpenDetailsButton
                      detailsId={`product-edit-${product.id}`}
                      className={actionPrimaryClass}
                    >
                      Редакция
                    </AdminOpenDetailsButton>
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
                        {product.is_sold_out ? "Активирай" : "Изчерпан"}
                      </button>
                    </form>
                    <AdminConfirmForm
                      action={deleteProduct}
                      confirmMessage={`Сигурни ли сте, че искате да изтриете „${product.name}"?`}
                      className="inline"
                    >
                      <input type="hidden" name={adminFormFields.common.tab} value="products" />
                      <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                      <button type="submit" className={actionDangerClass}>
                        Изтрий
                      </button>
                    </AdminConfirmForm>
                  </div>
                </header>

                <details
                  id={`product-edit-${product.id}`}
                  className={productSectionClass}
                >
                  <summary className={productSectionSummaryClass}>
                    <span>Редактирай продукт</span>
                    <span className="text-xs font-normal text-boutique-muted" aria-hidden>
                      Форма
                    </span>
                  </summary>
                  <div className="border-t border-boutique-line/50 px-3 py-4 sm:px-4">
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
                      Име
                      <input
                        name={adminFormFields.product.name}
                        defaultValue={product.name}
                        required
                        className={adminFieldClass}
                      />
                    </label>
                    <label className="text-sm font-medium text-boutique-ink">
                      Основна цена / цена на най-евтиния вариант (евро)
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
                    <div className="md:col-span-2">
                      <fieldset className="space-y-4 rounded-lg border border-boutique-line/70 bg-boutique-bg/40 p-4">
                        <legend className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                          Съдържание на продуктовата страница
                        </legend>
                        <ProductPageContentFields
                          defaults={{
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
                        Категории
                      </legend>
                      {categories.length === 0 ? (
                        <p className={adminHelperClass}>Няма налични категории.</p>
                      ) : (
                        <div className="mt-2 space-y-4">
                          {(["product", "occasion"] as const).map((categoryType) => (
                            <div key={categoryType}>
                              <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                                {categoryType === "product" ? "Продукти" : "Поводи"}
                              </p>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {sortCategoriesForDisplay(
                                  categories.filter(
                                    (category) => category.category_type === categoryType,
                                  ),
                                )
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
                                          title="Основна категория за breadcrumb и SEO"
                                        >
                                          <input
                                            name={adminFormFields.product.primaryCategoryId}
                                            type="radio"
                                            value={category.id}
                                            defaultChecked={primaryCategoryId === category.id}
                                            aria-label={`Основна за SEO: ${getCategoryDisplayLabel(categories, category)}`}
                                            className="h-3.5 w-3.5 border-boutique-line text-boutique-accent"
                                          />
                                          Основна
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
                        Отметнете категориите на продукта. При продуктовите категории маркирайте
                        една категория като „Основна“ за breadcrumb и SEO.
                      </p>
                    </fieldset>

                    <details className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <summary className="cursor-pointer px-1 text-sm font-medium text-boutique-ink">
                        Опции и ценообразуване
                      </summary>
                      <div className="mt-3">
                        <ProductOptionGroupsEditor
                          initialGroups={initialOptionGroups}
                          allDependencyOptions={productDependencyOptions}
                          basePrice={Number(product.price) || 0}
                          helperClassName={adminHelperClass}
                          fieldClassName={adminFieldClass}
                        />
                      </div>
                    </details>

                    <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        Цветови настройки
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
                        Персонализация
                      </legend>
                      <ProductPersonalizationFieldsEditor
                        initialFields={initialPersonalizationFields}
                        helperClassName={adminHelperClass}
                        fieldClassName={adminFieldClass}
                      />
                    </fieldset>
                    <details className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <summary className="cursor-pointer px-1 text-sm font-medium text-boutique-ink">
                        Подходящи готови пожелания
                      </summary>
                      <div className="mt-3">
                        <ProductWishSelector
                          wishes={wishTemplates}
                          occasions={occasionCategories}
                          wishOccasionLinks={wishTemplateOccasions}
                          selectedIds={
                            wishTemplateIdsByProductId.get(product.id) ?? []
                          }
                          helperClassName={adminHelperClass}
                        />
                      </div>
                    </details>
                    <fieldset className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        Въпроси и отговори
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
                      Бележка за доставка/изработка
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
                          label="Снимки на продукта"
                          className={adminFieldClass}
                          helperClassName={adminHelperClass}
                          existingGalleryCount={galleryImageCount}
                          helperText="Изберете снимки и натиснете „Запази промените“. PNG, JPG или WEBP — оптимизират се автоматично."
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
                      Изчерпан
                    </label>

                    <div className="md:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <AdminSubmitButton
                          pendingLabel={
                            hasNoGalleryImages
                              ? "Запазване и качване…"
                              : "Запазване…"
                          }
                          className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Запази промените
                        </AdminSubmitButton>
                      </div>
                      <AdminFormPendingGuard
                        message={
                          hasNoGalleryImages
                            ? "Запазване и качване на снимки… Моля, не затваряйте страницата."
                            : undefined
                        }
                      />
                    </div>
                  </form>

                  <AdminConfirmForm
                    action={deleteProduct}
                    confirmMessage={`Сигурни ли сте, че искате да изтриете „${product.name}"?`}
                    className="mt-5 border-t border-red-100 pt-4"
                  >
                    <input type="hidden" name={adminFormFields.common.tab} value="products" />
                    <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
                    >
                      Изтрий продукта
                    </button>
                  </AdminConfirmForm>

                  <ProductLandingPagesPanel
                    productId={product.id}
                    productSlug={product.slug}
                    landingPages={landingPagesByProductId.get(product.id) ?? []}
                    migrationMissing={landingPagesMigrationMissing}
                  />

                  <section className="mt-5 border-t border-boutique-line/70 pt-5">
                    <div>
                      <h4 className="font-semibold text-boutique-ink">Галерия</h4>
                      <p className="mt-1 text-xs text-boutique-muted">
                        Добавяйте, заменяйте или изтривайте отделни снимки. Промяната на
                        настройките на продукта не засяга галерията.
                      </p>
                    </div>

                    {hasNoGalleryImages ? (
                      <p
                        role="status"
                        className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
                      >
                        {DUPLICATE_MISSING_IMAGES_NOTICE} Изберете снимки във формата по-горе и
                        натиснете „Запази промените“.
                      </p>
                    ) : (
                      <ProductGalleryAddForm
                        productId={product.id}
                        productName={product.name}
                        existingGalleryCount={galleryImageCount}
                      />
                    )}

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
                                Снимка {index + 1}
                              </span>
                              {image.is_primary ? (
                                <span className="rounded-full bg-boutique-warm px-2 py-1 text-[0.65rem] font-semibold text-boutique-ink">
                                  Основна
                                </span>
                              ) : (
                                <form action={setPrimaryProductImage}>
                                  <input
                                    type="hidden"
                                    name={adminFormFields.productImage.imageId}
                                    value={image.id}
                                  />
                                  <button className="text-xs font-semibold text-boutique-sage-deep">
                                    Направи основна
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
                                Alt текст
                                <input
                                  name={adminFormFields.productImage.altText}
                                  type="text"
                                  maxLength={160}
                                  defaultValue={image.alt_text ?? ""}
                                  placeholder="Кратко описание на снимката"
                                  className={`${adminFieldClass} mt-1 text-xs`}
                                />
                              </label>
                              <button className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/50">
                                Запази alt
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
                                  Наляво
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
                                  Надясно
                                </button>
                              </form>
                              <form action={deleteProductGalleryImage}>
                                <input
                                  type="hidden"
                                  name={adminFormFields.productImage.imageId}
                                  value={image.id}
                                />
                                <button className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">
                                  Изтрий
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
                  </div>
                </details>

                <details className={productSectionClass}>
                  <summary className={productSectionSummaryClass}>
                    <span>Витрина и свързани продукти</span>
                    <span className="text-xs font-normal text-boutique-muted" aria-hidden>
                      Витрина
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
                      products={products
                        .filter((option) => option.id !== product.id)
                        .map((option) => ({ id: option.id, name: option.name }))}
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
                      Запази настройките
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
    </article>
  );
}
