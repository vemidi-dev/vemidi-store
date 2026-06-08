import { deleteProduct, updateProduct } from "@/app/admin/actions";
import { ImageFileInput } from "@/components/admin/image-file-input";
import { ProductColorFieldsEditor } from "@/components/admin/product-color-fields-editor";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import type { AdminData } from "@/lib/admin/data";
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
  } = data;

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

            return (
              <li
                key={product.id}
                className="rounded-xl border border-boutique-line/80 bg-boutique-bg p-4 md:p-5"
              >
                <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                  <div className="h-24 w-full overflow-hidden rounded-lg border border-boutique-line bg-white md:h-28">
                    {product.image_url ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${product.image_url})` }}
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-xs text-boutique-muted">
                        Няма снимка
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-heading text-xl text-boutique-ink">{product.name}</h3>
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
                      <input type="hidden" name="tab" value="products" />
                      <input type="hidden" name="id" value={product.id} />
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
                    <input type="hidden" name="tab" value="products" />
                    <input type="hidden" name="id" value={product.id} />
                    <input
                      type="hidden"
                      name="existing_image_url"
                      value={product.image_url ?? ""}
                    />

                    <label className="text-sm font-medium text-boutique-ink">
                      Име
                      <input
                        name="name"
                        defaultValue={product.name}
                        required
                        className={adminFieldClass}
                      />
                    </label>
                    <label className="text-sm font-medium text-boutique-ink">
                      Цена (евро)
                      <input
                        name="price"
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
                        name="description"
                        rows={3}
                        defaultValue={product.description}
                        required
                        className={`${adminFieldClass} resize-y`}
                      />
                    </label>
                    <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                      Допълнителна информация
                      <textarea
                        name="additional_info"
                        rows={3}
                        defaultValue={product.additional_info ?? ""}
                        className={`${adminFieldClass} resize-y`}
                      />
                    </label>

                    <ImageFileInput
                      name="image_file"
                      label="Нова снимка (по избор)"
                      className={adminFieldClass}
                      helperClassName={adminHelperClass}
                      helperText="Ако не качите нов файл, ще остане текущото изображение. Формати: PNG, JPG, WEBP или SVG (до 5 MB)."
                    />

                    <fieldset className="rounded-lg border border-boutique-line/70 bg-boutique-bg p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium text-boutique-ink">
                        Категории
                      </legend>
                      {categories.length === 0 ? (
                        <p className={adminHelperClass}>Няма налични категории.</p>
                      ) : (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {categories.map((category) => (
                            <label
                              key={`${product.id}-${category.id}-edit`}
                              className="inline-flex items-center gap-2 text-sm text-boutique-ink"
                            >
                              <input
                                name="category_ids"
                                type="checkbox"
                                value={category.id}
                                defaultChecked={assignedIds.includes(category.id)}
                                className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                              />
                              {category.name}
                            </label>
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

                    <label className="inline-flex items-center gap-2 text-sm text-boutique-ink md:col-span-2">
                      <input
                        name="is_customizable"
                        type="checkbox"
                        defaultChecked={product.is_customizable}
                        className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                      />
                      Продуктът е персонализируем
                    </label>
                    <label className="text-sm font-medium text-boutique-ink md:col-span-2">
                      Бележка за доставка/изработка
                      <textarea
                        name="fulfillment_note"
                        rows={2}
                        defaultValue={product.fulfillment_note ?? ""}
                        className={`${adminFieldClass} resize-y`}
                      />
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
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
