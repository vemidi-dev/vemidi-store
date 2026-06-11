import {
  deleteProduct,
  deleteProductGalleryImage,
  moveProductImage,
  setPrimaryProductImage,
  updateProduct,
} from "@/app/admin/actions";
import { ImageFileInput } from "@/components/admin/image-file-input";
import { ProductCardBadgeField } from "@/components/admin/product-card-badge-field";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import { ProductPersonalizationFieldsEditor } from "@/components/admin/product-personalization-fields-editor";
import { ProductWishSelector } from "@/components/admin/product-wish-selector";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import type { AdminData } from "@/lib/admin/data";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryRow } from "@/lib/admin/types";

export function ProductListPanel({ data }: { data: AdminData }) {
  const {
    products,
    categories,
    colorGroups,
    colorOptions,
    categoryById,
    categoryIdsByProductId,
    colorGroupById,
    colorOptionById,
    colorFieldsByProductId,
    selectedColorOptionIdsByFieldId,
    imagesByProductId,
    personalizationFieldsByProductId,
    wishTemplates,
    wishTemplateOccasions,
    wishTemplateIdsByProductId,
  } = data;

  const occasionCategories = categories.filter(
    (category) => category.category_type === "occasion",
  );

  return (
    <article className={adminPanelClass}>
      <h2 className="font-heading text-2xl text-boutique-ink">Всички продукти</h2>

      {products.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">Няма добавени продукти.</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {products.map((product) => {
            const assignedIds = categoryIdsByProductId.get(product.id) ?? [];
            const assignedCategories = assignedIds
              .map((categoryId) => categoryById.get(categoryId))
              .filter((category): category is CategoryRow => category !== undefined);
            const fields = (colorFieldsByProductId.get(product.id) ?? []).filter(
              (field) => field.enabled,
            );
            const colorFieldsForProduct = fields.map((field) => {
              const selectedOptionIds =
                selectedColorOptionIdsByFieldId.get(field.id) ?? new Set<string>();
              const selectedOptionLabels = [...selectedOptionIds]
                .map((optionId) => colorOptionById.get(optionId)?.name)
                .filter((name): name is string => Boolean(name));

              return {
                field,
                groupLabel: colorGroupById.get(field.group_id)?.label ?? "Цветове",
                selectedOptionLabels,
              };
            });
            const initialColorFields = fields.map((field) => ({
              label: field.label,
              groupId: field.group_id,
              minSelect: field.min_select,
              maxSelect: field.max_select,
              optionIds: [
                ...(selectedColorOptionIdsByFieldId.get(field.id) ?? new Set<string>()),
              ],
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
                        required: false,
                        allowsWishTemplates: true,
                      },
                    ]
                  : [];

            return (
              <li
                key={product.id}
                className="rounded-xl border border-boutique-line/80 bg-boutique-bg p-4 md:p-5"
              >
                <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                  <div className="h-24 w-full overflow-hidden rounded-lg border border-boutique-line bg-white md:h-28">
                    {productImages[0]?.image_url || product.image_url ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${
                            productImages.find((image) => image.is_primary)?.image_url ??
                            productImages[0]?.image_url ??
                            product.image_url
                          })`,
                        }}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-boutique-muted">
                        Няма снимка
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading text-xl text-boutique-ink">{product.name}</h3>
                        {product.is_sold_out ? (
                          <span className="rounded-full bg-boutique-muted/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                            Изчерпан
                          </span>
                        ) : null}
                      </div>
                      <p className="font-medium text-boutique-ink">
                        {Number(product.price).toFixed(2)} €
                      </p>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {assignedCategories.length === 0 ? (
                        <span className="rounded-full border border-boutique-line px-2.5 py-1 text-xs text-boutique-muted">
                          Без категория
                        </span>
                      ) : (
                        assignedCategories.map((category) => (
                          <span
                            key={`${product.id}-${category.id}`}
                            className="rounded-full border border-boutique-line px-2.5 py-1 text-xs text-boutique-ink"
                          >
                            {category.name}
                          </span>
                        ))
                      )}
                    </div>

                    {colorFieldsForProduct.length > 0 ? (
                      <div className="mt-2 space-y-1 text-xs text-boutique-muted">
                        {colorFieldsForProduct.map(
                          ({ field, groupLabel, selectedOptionLabels }) => (
                            <p key={`${product.id}-${field.id}`}>
                              {field.label} ({groupLabel}): {field.min_select}-
                              {field.max_select} избора
                              {selectedOptionLabels.length > 0
                                ? ` · ${selectedOptionLabels.join(", ")}`
                                : ""}
                            </p>
                          ),
                        )}
                      </div>
                    ) : null}

                    <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
                      {product.description}
                    </p>
                    {product.additional_info ? (
                      <p className="mt-2 text-sm leading-relaxed text-boutique-muted/90">
                        {product.additional_info}
                      </p>
                    ) : null}
                    {product.fulfillment_note ? (
                      <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
                        {product.fulfillment_note}
                      </p>
                    ) : null}

                    <form action={deleteProduct} className="mt-4">
                      <input type="hidden" name={adminFormFields.common.tab} value="products" />
                      <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
                      >
                        Изтрий
                      </button>
                    </form>
                  </div>
                </div>

                <details className="mt-4 rounded-lg border border-boutique-line/70 bg-boutique-paper p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-boutique-ink">
                    Редактирай продукт
                  </summary>
                  <form action={updateProduct} className="mt-4 grid gap-4 md:grid-cols-2">
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
                      Цена (евро)
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
                    <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                      Описание
                      <textarea
                        name={adminFormFields.product.description}
                        rows={3}
                        defaultValue={product.description}
                        required
                        className={`${adminFieldClass} resize-y`}
                      />
                    </label>
                    <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                      Допълнителна информация
                      <textarea
                        name={adminFormFields.product.additionalInfo}
                        rows={3}
                        defaultValue={product.additional_info ?? ""}
                        className={`${adminFieldClass} resize-y`}
                      />
                    </label>

                    <ImageFileInput
                      name={adminFormFields.product.imageFiles}
                      label="Добави снимки към галерията"
                      multiple
                      className={adminFieldClass}
                      helperClassName={adminHelperClass}
                      helperText="Изберете една или повече PNG, JPG или WEBP снимки до 5 MB."
                    />

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
                                {categories
                                  .filter((category) => category.category_type === categoryType)
                                  .map((category) => (
                                    <label
                                      key={`${product.id}-${category.id}-edit`}
                                      className="inline-flex items-center gap-2 text-sm text-boutique-ink"
                                    >
                                      <input
                                        name={adminFormFields.product.categoryIds}
                                        type="checkbox"
                                        value={category.id}
                                        defaultChecked={assignedIds.includes(category.id)}
                                        className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                                      />
                                      {category.name}
                                    </label>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </fieldset>

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
                      <button
                        type="submit"
                        className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
                      >
                        Запази промените
                      </button>
                    </div>
                  </form>

                  {productImages.length > 0 ? (
                    <section className="mt-5 border-t border-boutique-line/70 pt-5">
                      <div>
                        <h4 className="font-semibold text-boutique-ink">Галерия</h4>
                        <p className="mt-1 text-xs text-boutique-muted">
                          Изберете корица и подредете снимките за картата и продуктовата страница.
                        </p>
                      </div>
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
                          </article>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
