import { createProduct } from "@/app/admin/actions";
import { AdminUnsavedChangesGuard } from "@/components/admin/admin-unsaved-changes-guard";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { ProductImageFileInput } from "@/components/admin/product-image-file-input";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import { ProductOptionGroupsEditor } from "@/components/admin/product-option-groups-editor";
import { ProductPersonalizationFieldsEditor } from "@/components/admin/product-personalization-fields-editor";
import { ProductFulfillmentFields } from "@/components/admin/product-fulfillment-fields";
import { ProductCardBadgeField } from "@/components/admin/product-card-badge-field";
import { ProductContentSeoFields } from "@/components/admin/product-content-seo-fields";
import { ProductPageContentFields } from "@/components/admin/product-page-content-fields";
import { ProductSeoFields } from "@/components/admin/product-seo-fields";
import { ProductWishSelector } from "@/components/admin/product-wish-selector";
import { ProductFaqFields } from "@/components/admin/product-faq-fields";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import {
  getCategoryDisplayLabel,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import { makeAdminTabHref } from "@/lib/admin/params";
import type {
  CategoryRow,
  ColorGroupRow,
  ColorOptionRow,
  ProductCreateDraft,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";
import type { FaqGroupRow, FaqItemRow } from "@/lib/faq/types";

type ProductCreatePanelProps = {
  categories: CategoryRow[];
  colorGroups: ColorGroupRow[];
  colorOptions: ColorOptionRow[];
  wishes: WishTemplateRow[];
  wishOccasionLinks: WishTemplateOccasionRow[];
  faqProductGroups: FaqGroupRow[];
  faqItems: FaqItemRow[];
  draft: ProductCreateDraft | null;
  imageReselectWarning?: boolean;
};

export function ProductCreatePanel({
  categories,
  colorGroups,
  colorOptions,
  wishes,
  wishOccasionLinks,
  faqProductGroups,
  faqItems,
  draft,
  imageReselectWarning = false,
}: ProductCreatePanelProps) {
  const productCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "product"),
  );
  const occasionCategories = categories.filter(
    (category) => category.category_type === "occasion",
  );
  const selectedPrimaryCategoryId = draft?.primaryCategoryId ?? null;

  return (
    <article className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">Добавяне на продукт</h2>
      <p className="mt-2 text-sm text-boutique-muted">
        Попълнете основните данни за продукта. Полетата са организирани по секции.
      </p>

      <form id="admin-create-product-form" action={createProduct} className="mt-7 space-y-7">
        <AdminUnsavedChangesGuard formId="admin-create-product-form" />
        <input type="hidden" name={adminFormFields.common.tab} value="products" />

        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Основна информация
          </legend>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-boutique-ink">
              Име на продукта
              <input
                name={adminFormFields.product.name}
                required
                defaultValue={draft?.name ?? ""}
                className={adminFieldClass}
                placeholder="Напр. Гравирана рамка"
              />
              <p className={adminHelperClass}>
                Кратко и ясно име, което ще се вижда в магазина.
              </p>
            </label>
            <label className="text-sm font-medium text-boutique-ink">
              Основна цена / цена на най-евтиния вариант (евро)
              <input
                name={adminFormFields.product.price}
                type="number"
                step="0.01"
                min="0"
                required
                defaultValue={draft?.price ?? ""}
                className={adminFieldClass}
                placeholder="0.00"
              />
              <p className={adminHelperClass}>
                Ако продуктът има варианти, въведете цената на най-евтиния вариант.
              </p>
            </label>
          </div>
        </fieldset>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Съдържание на продуктовата страница
          </legend>
          <ProductPageContentFields
            defaults={{
              subtitle: draft?.subtitle ?? "",
              description: draft?.description ?? "",
              additionalInfo: draft?.additionalInfo ?? "",
              personalization_info: draft?.personalizationInfo ?? "",
              dimensions_materials: draft?.dimensionsMaterials ?? "",
              ordering_info: draft?.orderingInfo ?? "",
            }}
            fieldClassName={adminFieldClass}
            helperClassName={adminHelperClass}
          />
        </fieldset>

        <ProductSeoFields
          initialSlug={draft?.slug ?? ""}
          mode="create"
        />

        <ProductContentSeoFields />

        {imageReselectWarning ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            Предишното качване на снимки не успя. Продуктът може да е запазен без изображения —
            изберете снимките отново преди повторно изпращане, или ги добавете от галерията при
            редакция на продукта.
          </div>
        ) : null}

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Визия и категория
          </legend>
          <div className="grid gap-5 md:grid-cols-2">
            <ProductImageFileInput
              name={adminFormFields.product.imageFiles}
              altTextName={adminFormFields.product.imageAltTexts}
              label="Снимки на продукта"
              className={adminFieldClass}
              helperClassName={adminHelperClass}
              helperText="Може да изберете няколко PNG, JPG или WEBP файла. Първата снимка става основна след оптимизация."
            />

            <fieldset className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3">
              <legend className="px-1 text-sm font-medium text-boutique-ink">Категории</legend>
              {categories.length === 0 ? (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Първо е необходима категория</p>
                  <p className="mt-1 leading-relaxed">
                    Всеки продукт трябва да бъде включен поне в една категория.
                  </p>
                  <a
                    href={makeAdminTabHref("categories")}
                    className="mt-3 inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider transition hover:border-amber-500"
                  >
                    Добави категория
                  </a>
                </div>
              ) : (
                <div className="mt-2 space-y-4">
                  {[
                    ["Продукти", productCategories],
                    ["Поводи", occasionCategories],
                  ].map(([label, groupedCategories]) => (
                    <div key={label as string}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                        {label as string}
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(groupedCategories as CategoryRow[]).map((category) => (
                          <div key={category.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-boutique-ink">
                            <label className="inline-flex min-w-0 items-center gap-2">
                              <input
                                name={adminFormFields.product.categoryIds}
                                type="checkbox"
                                value={category.id}
                                defaultChecked={draft?.categoryIds.includes(category.id)}
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
                                  defaultChecked={selectedPrimaryCategoryId === category.id}
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
              <p className={adminHelperClass}>
                Отметнете категориите на продукта. При продуктовите категории маркирайте една
                категория като „Основна“ за breadcrumb и SEO.
              </p>
            </fieldset>
          </div>
        </fieldset>

        <details className="border-t border-boutique-line/70 pt-6">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Подходящи готови пожелания
          </summary>
          <div className="mt-4">
            <ProductWishSelector
              wishes={wishes}
              occasions={occasionCategories}
              wishOccasionLinks={wishOccasionLinks}
              selectedIds={draft?.wishTemplateIds}
              helperClassName={adminHelperClass}
            />
          </div>
        </details>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Въпроси и отговори
          </legend>
          <ProductFaqFields
            productGroups={faqProductGroups}
            items={faqItems}
            helperClassName={adminHelperClass}
          />
        </fieldset>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Допълнителни настройки
          </legend>
          <label className="text-sm font-medium text-boutique-ink">
            Бележка за доставка/изработка
            <textarea
              name={adminFormFields.product.fulfillmentNote}
              rows={2}
              defaultValue={draft?.fulfillmentNote ?? ""}
              className={`${adminFieldClass} resize-y`}
              placeholder="Напр. Изпращане за 5-10 работни дни..."
            />
            <p className={adminHelperClass}>
              Кратка бележка за срок, изработка или потвърждение.
            </p>
          </label>

          <ProductCardBadgeField defaultValue={draft?.cardBadge} />

          <ProductFulfillmentFields
            initialFulfillmentType={draft?.fulfillmentType}
            initialStockQuantity={draft?.stockQuantity}
          />

          <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink">
            <input
              name={adminFormFields.product.isSoldOut}
              type="checkbox"
              defaultChecked={draft?.isSoldOut}
              className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
            />
            Изчерпан
            <span className="text-xs font-normal text-boutique-muted">
              — продуктът остава видим, но не може да се поръча.
            </span>
          </label>
        </fieldset>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Персонализация
          </legend>
          <ProductPersonalizationFieldsEditor
            initialFields={draft?.personalizationFields}
            helperClassName={adminHelperClass}
            fieldClassName={adminFieldClass}
          />
        </fieldset>

        <details className="border-t border-boutique-line/70 pt-6">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Опции и ценообразуване
          </summary>
          <div className="mt-4">
            <ProductOptionGroupsEditor
              initialGroups={draft?.optionGroups}
              allDependencyOptions={[]}
              basePrice={Number(draft?.price) || 0}
              helperClassName={adminHelperClass}
              fieldClassName={adminFieldClass}
            />
          </div>
        </details>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Цветови настройки
          </legend>
          <ProductColorFieldsEditor
            colorGroups={colorGroups}
            colorOptions={colorOptions}
            initialFields={draft?.colorFields}
            helperClassName={adminHelperClass}
            fieldClassName={adminFieldClass}
          />
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-boutique-line/70 pt-6">
          <p className="text-xs uppercase tracking-[0.16em] text-boutique-muted">
            Задължителните полета са отбелязани в секциите.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={makeAdminTabHref("products")}
              className="rounded-full border border-boutique-line px-5 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
            >
              Изчисти
            </a>
            {categories.length === 0 ? (
              <a
                href={makeAdminTabHref("categories")}
                className="rounded-full bg-boutique-accent px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-ink"
              >
                Първо добави категория
              </a>
            ) : (
              <AdminSubmitButton
                pendingLabel="Обработване и качване…"
                className="rounded-full bg-boutique-ink px-6 py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-70"
              >
                Добави продукт
              </AdminSubmitButton>
            )}
          </div>
          <AdminFormPendingGuard />
        </div>
      </form>
    </article>
  );
}
