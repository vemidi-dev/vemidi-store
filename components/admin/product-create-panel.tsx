"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { createProduct } from "@/app/admin/actions";
import { AdminUnsavedChangesGuard } from "@/components/admin/admin-unsaved-changes-guard";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminLazyDetailsMount } from "@/components/admin/admin-lazy-details-mount";
import { ProductImageFileInput } from "@/components/admin/product-image-file-input";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import { ProductOptionGroupsEditor } from "@/components/admin/product-option-groups-editor";
import { ProductPersonalizationFieldsEditor } from "@/components/admin/product-personalization-fields-editor";
import { ProductPublicationStatusField } from "@/components/admin/product-publication-status-field";
import { ProductFulfillmentFields } from "@/components/admin/product-fulfillment-fields";
import { ProductVisibilityField } from "@/components/admin/product-visibility-field";
import { ProductCardBadgeField } from "@/components/admin/product-card-badge-field";
import { ProductContentSeoFields } from "@/components/admin/product-content-seo-fields";
import { ProductPageContentFields } from "@/components/admin/product-page-content-fields";
import { ProductSeoFields } from "@/components/admin/product-seo-fields";
import { ProductWishSelector } from "@/components/admin/product-wish-selector";
import { ProductFaqFields } from "@/components/admin/product-faq-fields";
import {
  adminAccordionClass,
  adminAccordionSummaryClass,
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import {
  clearProductCreateLocalDraft,
  PRODUCT_CREATE_LOCAL_DRAFT_DEBOUNCE_MS,
  readProductCreateLocalDraft,
  shouldClearProductCreateLocalDraftOnSuccess,
  validateProductCreateColorFieldsClient,
  writeProductCreateLocalDraft,
  type ProductCreateLocalDraft,
} from "@/lib/admin/product-create-local-draft";
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
  successMessage?: string;
};

function mergeDrafts(
  serverDraft: ProductCreateDraft | null,
  localDraft: ProductCreateLocalDraft | null,
): ProductCreateLocalDraft | null {
  if (serverDraft) {
    return {
      ...serverDraft,
      savedAt: localDraft?.savedAt ?? null,
      metaTitle: localDraft?.metaTitle ?? "",
      metaDescription: localDraft?.metaDescription ?? "",
      ogTitle: localDraft?.ogTitle ?? "",
      ogDescription: localDraft?.ogDescription ?? "",
      faqGroupIds: localDraft?.faqGroupIds ?? [],
      faqItemIds: localDraft?.faqItemIds ?? [],
    };
  }
  return localDraft;
}

export function ProductCreatePanel({
  categories,
  colorGroups,
  colorOptions,
  wishes,
  wishOccasionLinks,
  faqProductGroups,
  faqItems,
  draft: serverDraft,
  imageReselectWarning = false,
  successMessage = "",
}: ProductCreatePanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [activeDraft, setActiveDraft] = useState<ProductCreateLocalDraft | null>(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [hadLocalDraft, setHadLocalDraft] = useState(false);
  const [clientError, setClientError] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (successMessage && shouldClearProductCreateLocalDraftOnSuccess(successMessage)) {
      clearProductCreateLocalDraft();
      setActiveDraft(null);
      setDraftStatus("");
      setHadLocalDraft(false);
      setHydrated(true);
      return;
    }

    const localDraft = readProductCreateLocalDraft();
    const merged = mergeDrafts(serverDraft, localDraft);
    setHadLocalDraft(Boolean(localDraft) && !serverDraft);
    setActiveDraft(merged);
    if (localDraft && !serverDraft) {
      setDraftStatus("Има запазена чернова");
    } else if (serverDraft) {
      setDraftStatus("Възстановени данни след грешка");
      // Keep local copy so a truncated URL draft is not the only recovery path.
      queueMicrotask(() => {
        const form = formRef.current;
        if (form) {
          writeProductCreateLocalDraft(new FormData(form));
        }
      });
    }
    setHydrated(true);
  }, [serverDraft, successMessage]);

  const persistDraft = useCallback(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    if (writeProductCreateLocalDraft(new FormData(form))) {
      setDraftStatus("Черновата е запазена");
      setHadLocalDraft(true);
    }
  }, []);

  const schedulePersist = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      persistDraft();
    }, PRODUCT_CREATE_LOCAL_DRAFT_DEBOUNCE_MS);
  }, [persistDraft]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const handleClearDraft = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    clearProductCreateLocalDraft();
    setActiveDraft(null);
    setHadLocalDraft(false);
    setDraftStatus("");
    setClientError("");
    setFormKey((value) => value + 1);
    router.replace(makeAdminTabHref("products"));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const colorError = validateProductCreateColorFieldsClient(formData);
    if (colorError) {
      event.preventDefault();
      setClientError(colorError);
      persistDraft();
      return;
    }
    setClientError("");
    writeProductCreateLocalDraft(formData);
  };

  const productCategories = useMemo(
    () =>
      sortCategoriesForDisplay(
        categories.filter((category) => category.category_type === "product"),
      ),
    [categories],
  );
  const occasionCategories = useMemo(
    () => categories.filter((category) => category.category_type === "occasion"),
    [categories],
  );
  const materialCategories = useMemo(
    () =>
      sortCategoriesForDisplay(
        categories.filter((category) => category.category_type === "material"),
      ),
    [categories],
  );
  const selectedPrimaryCategoryId = activeDraft?.primaryCategoryId ?? null;
  const shouldStartOpen =
    Boolean(activeDraft) || imageReselectWarning || hadLocalDraft;

  if (!hydrated) {
    return (
      <article className={adminPanelClass}>
        <div className="px-4 py-6 text-sm text-boutique-muted sm:px-5">
          Зареждане на формуляра…
        </div>
      </article>
    );
  }

  return (
    <article className={adminPanelClass}>
      <details className={adminAccordionClass} open={shouldStartOpen || undefined}>
        <summary
          className={adminAccordionSummaryClass}
          aria-label="Добавяне на продукт — формуляр"
        >
          <span className="font-heading text-lg text-boutique-ink">Добавяне на продукт</span>
          <span className="text-sm font-normal text-boutique-muted" aria-hidden>
            Формуляр
          </span>
        </summary>
        <div className="border-t border-boutique-line/80 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">
          <p className="text-sm text-boutique-muted">
            Попълнете основните данни за продукта. Можете да го запазите като чернова или да го
            публикувате директно, ако всички задължителни полета и поне една снимка са налични.
          </p>

          {draftStatus || hadLocalDraft ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2 text-xs text-boutique-muted">
              <p aria-live="polite">{draftStatus || "Има запазена чернова"}</p>
              <button
                type="button"
                onClick={handleClearDraft}
                className="rounded-full border border-boutique-line bg-white px-3 py-1.5 font-semibold text-boutique-ink transition hover:border-boutique-accent/40"
              >
                Изчисти черновата
              </button>
            </div>
          ) : null}

          {clientError ? (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {clientError}
            </div>
          ) : null}

      <form
        key={formKey}
        id="admin-create-product-form"
        ref={formRef}
        action={createProduct}
        className="mt-7 space-y-7"
        onInput={schedulePersist}
        onChange={schedulePersist}
        onSubmit={handleSubmit}
      >
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
                defaultValue={activeDraft?.name ?? ""}
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
                defaultValue={activeDraft?.price ?? ""}
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
              headingSubtitle: activeDraft?.headingSubtitle ?? "",
              subtitle: activeDraft?.subtitle ?? "",
              description: activeDraft?.description ?? "",
              additionalInfo: activeDraft?.additionalInfo ?? "",
              personalization_info: activeDraft?.personalizationInfo ?? "",
              dimensions_materials: activeDraft?.dimensionsMaterials ?? "",
              ordering_info: activeDraft?.orderingInfo ?? "",
            }}
            fieldClassName={adminFieldClass}
            helperClassName={adminHelperClass}
          />
        </fieldset>

        <ProductSeoFields
          initialSlug={activeDraft?.slug ?? ""}
          mode="create"
        />

        <ProductContentSeoFields
          defaults={{
            meta_title: activeDraft?.metaTitle ?? "",
            meta_description: activeDraft?.metaDescription ?? "",
            og_title: activeDraft?.ogTitle ?? "",
            og_description: activeDraft?.ogDescription ?? "",
          }}
        />

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
                    ["Заготовки и материали", materialCategories],
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
                                defaultChecked={activeDraft?.categoryIds.includes(category.id)}
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

        <AdminLazyDetailsMount
          className="border-t border-boutique-line/70 pt-6"
          id="admin-create-product-wishes"
          summary={
            <span className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
              Подходящи готови пожелания
            </span>
          }
          contentClassName="mt-4"
        >
          <ProductWishSelector
            wishes={wishes}
            occasions={occasionCategories}
            wishOccasionLinks={wishOccasionLinks}
            selectedIds={activeDraft?.wishTemplateIds}
            helperClassName={adminHelperClass}
          />
        </AdminLazyDetailsMount>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Въпроси и отговори
          </legend>
          <ProductFaqFields
            productGroups={faqProductGroups}
            items={faqItems}
            selectedGroupIds={activeDraft?.faqGroupIds}
            selectedItemIds={activeDraft?.faqItemIds}
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
              defaultValue={activeDraft?.fulfillmentNote ?? ""}
              className={`${adminFieldClass} resize-y`}
              placeholder="Напр. Изпращане за 5-10 работни дни..."
            />
            <p className={adminHelperClass}>
              Кратка бележка за срок, изработка или потвърждение.
            </p>
          </label>

          <ProductCardBadgeField defaultValue={activeDraft?.cardBadge} />

          <ProductVisibilityField
            defaultValue={activeDraft?.visibility}
            fieldClassName={adminFieldClass}
            helperClassName={adminHelperClass}
          />

          <ProductFulfillmentFields
            initialFulfillmentType={activeDraft?.fulfillmentType}
            initialStockQuantity={activeDraft?.stockQuantity}
          />

          <label className="inline-flex items-center gap-2 text-sm font-medium text-boutique-ink">
            <input
              name={adminFormFields.product.isSoldOut}
              type="checkbox"
              defaultChecked={activeDraft?.isSoldOut}
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
            initialFields={activeDraft?.personalizationFields}
            helperClassName={adminHelperClass}
            fieldClassName={adminFieldClass}
          />
        </fieldset>

        <AdminLazyDetailsMount
          className="border-t border-boutique-line/70 pt-6"
          id="admin-create-product-options"
          summary={
            <span className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
              Опции и ценообразуване
            </span>
          }
          contentClassName="mt-4"
        >
          <ProductOptionGroupsEditor
            initialGroups={activeDraft?.optionGroups}
            allDependencyOptions={[]}
            productImages={[]}
            basePrice={Number(activeDraft?.price) || 0}
            helperClassName={adminHelperClass}
            fieldClassName={adminFieldClass}
          />
        </AdminLazyDetailsMount>

        <fieldset className="space-y-4 border-t border-boutique-line/70 pt-6">
          <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
            Цветови настройки
          </legend>
          <ProductColorFieldsEditor
            colorGroups={colorGroups}
            colorOptions={colorOptions}
            initialFields={activeDraft?.colorFields}
            helperClassName={adminHelperClass}
            fieldClassName={adminFieldClass}
          />
        </fieldset>

        <div className="flex flex-wrap items-end justify-between gap-5 border-t border-boutique-line/70 pt-6">
          <div className="min-w-[min(100%,16rem)] space-y-3">
            <ProductPublicationStatusField
              defaultValue={activeDraft?.publicationStatus ?? "draft"}
              allowedStatuses={["draft", "published"]}
              fieldClassName={adminFieldClass}
              helperClassName={adminHelperClass}
              helperText="Черновата не се вижда в магазина. Публикуването изисква пълни данни и поне една снимка."
            />
            <p className="text-xs uppercase tracking-[0.16em] text-boutique-muted">
              Задължителните полета са отбелязани в секциите.
            </p>
          </div>
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
        </div>
      </details>
    </article>
  );
}
