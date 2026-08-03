import {
  createProductMaterial,
  createProductVariantGroup,
  deleteProductMaterial,
  moveProductMaterial,
  updateProductMaterial,
  updateProductVariantGroup,
} from "@/app/admin/material-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type {
  ProductMaterialRow,
  ProductVariantGroupRow,
} from "@/lib/admin/types";
import {
  DEFAULT_VARIANT_DISPLAY_SIZE,
  DEFAULT_VARIANT_GROUP_KEY,
  DEFAULT_VARIANT_GROUP_NAME,
  VARIANT_DISPLAY_SIZE_LABELS,
  VARIANT_DISPLAY_SIZES,
  normalizeVariantDisplaySize,
} from "@/lib/product-variants";

export function MaterialManagementPanel({
  materials,
  variantGroups,
  loadError,
}: {
  materials: ProductMaterialRow[];
  variantGroups: ProductVariantGroupRow[];
  loadError?: string | null;
}) {
  const groups = [...variantGroups].sort((left, right) => {
    const byOrder = left.sort_order - right.sort_order;
    return byOrder || left.name.localeCompare(right.name, "bg");
  });
  const defaultGroupId =
    groups.find((group) => group.key === DEFAULT_VARIANT_GROUP_KEY)?.id ??
    groups[0]?.id ??
    "";

  const materialsByGroup = new Map<string, ProductMaterialRow[]>();
  for (const material of materials) {
    const groupId = material.group_id || defaultGroupId || "ungrouped";
    const list = materialsByGroup.get(groupId) ?? [];
    list.push(material);
    materialsByGroup.set(groupId, list);
  }
  for (const list of materialsByGroup.values()) {
    list.sort((left, right) => {
      const byOrder = left.sort_order - right.sort_order;
      return byOrder || left.name.localeCompare(right.name, "bg");
    });
  }

  return (
    <div className="space-y-6">
      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">Варианти</h2>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
          Визуални варианти със снимка, групирани по тип (Материал, Вид комплект,
          Стил, Форма…). Свързването към продуктови опции остава през{" "}
          <code className="text-xs">material_id</code>.
        </p>
      </article>

      <article className={adminPanelClass}>
        <h3 className="font-heading text-xl text-boutique-ink">Групи варианти</h3>
        <p className={`mt-2 ${adminHelperClass}`}>
          Групата „{DEFAULT_VARIANT_GROUP_NAME}“ е защитена и не може да се
          деактивира. Изтриване на групи не е налично в този етап.
        </p>

        <form
          action={createProductVariantGroup}
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <label className="text-sm font-medium text-boutique-ink">
            Име на група
            <input
              name={adminFormFields.variantGroup.name}
              required
              maxLength={120}
              placeholder="Напр. Вид комплект"
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Ключ (по избор)
            <input
              name={adminFormFields.variantGroup.key}
              maxLength={64}
              placeholder="Автоматично от името"
              className={adminFieldClass}
            />
            <span className={adminHelperClass}>
              Малки латински букви/цифри/_ . Ключът „material“ е запазен.
            </span>
          </label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
            Описание
            <textarea
              name={adminFormFields.variantGroup.description}
              rows={2}
              maxLength={500}
              className={`${adminFieldClass} resize-y`}
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
              Добави група
            </button>
          </div>
        </form>

        <div className="mt-5 space-y-3">
          {groups.map((group) => {
            const isProtected = group.key === DEFAULT_VARIANT_GROUP_KEY;
            return (
              <form
                key={group.id}
                action={updateProductVariantGroup}
                className="rounded-xl border border-boutique-line bg-white p-4 shadow-boutique-sm grid gap-3 md:grid-cols-2"
              >
                <input
                  type="hidden"
                  name={adminFormFields.variantGroup.id}
                  value={group.id}
                />
                <label className="text-xs font-medium text-boutique-ink">
                  Име
                  <input
                    name={adminFormFields.variantGroup.name}
                    defaultValue={group.name}
                    required
                    maxLength={120}
                    className={`${adminFieldClass} !mt-1`}
                  />
                </label>
                <label className="text-xs font-medium text-boutique-ink">
                  Ключ
                  <input
                    value={group.key}
                    readOnly
                    className={`${adminFieldClass} !mt-1 bg-boutique-bg/70`}
                  />
                </label>
                <label className="text-xs font-medium text-boutique-ink md:col-span-2">
                  Описание
                  <input
                    name={adminFormFields.variantGroup.description}
                    defaultValue={group.description ?? ""}
                    maxLength={500}
                    className={`${adminFieldClass} !mt-1`}
                  />
                </label>
                <label className="text-xs font-medium text-boutique-ink">
                  Ред
                  <input
                    name={adminFormFields.variantGroup.sortOrder}
                    type="number"
                    defaultValue={group.sort_order}
                    className={`${adminFieldClass} !mt-1`}
                  />
                </label>
                <label className="inline-flex items-center gap-2 self-end text-xs font-medium text-boutique-ink">
                  <input
                    name={adminFormFields.variantGroup.isActive}
                    type="checkbox"
                    defaultChecked={group.is_active}
                    disabled={isProtected}
                    className="h-4 w-4 rounded border-boutique-line text-boutique-accent disabled:opacity-50"
                  />
                  Активна
                  {isProtected ? " (защитена)" : ""}
                </label>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold"
                  >
                    Запази група
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </article>

      <article className={adminPanelClass}>
        <h3 className="font-heading text-xl text-boutique-ink">Нов вариант</h3>
        <form
          action={createProductMaterial}
          encType="multipart/form-data"
          className="mt-4 grid gap-3 md:grid-cols-2"
        >
          <label className="text-sm font-medium text-boutique-ink">
            Група
            <select
              name={adminFormFields.material.groupId}
              defaultValue={defaultGroupId}
              className={adminFieldClass}
              required
            >
              {groups
                .filter((group) => group.is_active)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Размер на картата
            <select
              name={adminFormFields.material.displaySize}
              defaultValue={DEFAULT_VARIANT_DISPLAY_SIZE}
              className={adminFieldClass}
            >
              {VARIANT_DISPLAY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {VARIANT_DISPLAY_SIZE_LABELS[size]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Име
            <input
              name={adminFormFields.material.name}
              required
              maxLength={120}
              placeholder="Напр. Дъб"
              className={adminFieldClass}
            />
          </label>
          <label className="text-sm font-medium text-boutique-ink">
            Снимка / текстура
            <input
              name={adminFormFields.material.imageFile}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={adminFieldClass}
            />
            <span className={adminHelperClass}>По избор. PNG, JPG или WEBP.</span>
          </label>
          <label className="text-sm font-medium text-boutique-ink md:col-span-2">
            Кратко описание
            <textarea
              name={adminFormFields.material.description}
              rows={2}
              maxLength={500}
              className={`${adminFieldClass} resize-y`}
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
              Добави вариант
            </button>
          </div>
        </form>
      </article>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {materials.length === 0 && !loadError ? (
        <p className="text-sm text-boutique-muted">Все още няма добавени варианти.</p>
      ) : (
        groups.map((group) => {
          const groupMaterials = materialsByGroup.get(group.id) ?? [];
          if (groupMaterials.length === 0) {
            return (
              <div key={group.id} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                  Група: {group.name} (0)
                </p>
                <p className="text-sm text-boutique-muted">Няма варианти в тази група.</p>
              </div>
            );
          }

          return (
            <div key={group.id} className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
                Група: {group.name} ({groupMaterials.length})
              </p>
              {groupMaterials.map((material, index) => {
                const displaySize = normalizeVariantDisplaySize(material.display_size);
                return (
                  <article
                    key={material.id}
                    className="rounded-xl border border-boutique-line bg-white p-4 shadow-boutique-sm"
                  >
                    <div className="flex flex-wrap items-start gap-4">
                      {material.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={material.image_url}
                          alt={material.name}
                          className="h-16 w-16 shrink-0 rounded-lg border border-boutique-line object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-boutique-line text-[10px] text-boutique-muted">
                          няма снимка
                        </span>
                      )}

                      <form
                        action={updateProductMaterial}
                        encType="multipart/form-data"
                        className="min-w-0 flex-1 grid gap-3 md:grid-cols-2"
                      >
                        <input
                          type="hidden"
                          name={adminFormFields.material.id}
                          value={material.id}
                        />
                        <label className="text-xs font-medium text-boutique-ink">
                          Име
                          <input
                            name={adminFormFields.material.name}
                            defaultValue={material.name}
                            required
                            maxLength={120}
                            className={`${adminFieldClass} !mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-boutique-ink">
                          Група
                          <select
                            name={adminFormFields.material.groupId}
                            defaultValue={material.group_id || defaultGroupId}
                            className={`${adminFieldClass} !mt-1`}
                          >
                            {groups.map((optionGroup) => (
                              <option key={optionGroup.id} value={optionGroup.id}>
                                {optionGroup.name}
                                {!optionGroup.is_active ? " (неактивна)" : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-boutique-ink">
                          Размер на картата
                          <select
                            name={adminFormFields.material.displaySize}
                            defaultValue={displaySize}
                            className={`${adminFieldClass} !mt-1`}
                          >
                            {VARIANT_DISPLAY_SIZES.map((size) => (
                              <option key={size} value={size}>
                                {VARIANT_DISPLAY_SIZE_LABELS[size]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-boutique-ink">
                          Описание
                          <input
                            name={adminFormFields.material.description}
                            defaultValue={material.description ?? ""}
                            maxLength={500}
                            className={`${adminFieldClass} !mt-1`}
                          />
                        </label>
                        <label className="text-xs font-medium text-boutique-ink md:col-span-2">
                          Нова снимка / текстура
                          <input
                            name={adminFormFields.material.imageFile}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className={`${adminFieldClass} !mt-1`}
                          />
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-boutique-ink">
                          <input
                            name={adminFormFields.material.isActive}
                            type="checkbox"
                            defaultChecked={material.is_active}
                            className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                          />
                          Активен (видим при избор в продукта)
                        </label>
                        <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                          <button
                            type="submit"
                            className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold"
                          >
                            Запази
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-boutique-line pt-3">
                      <form action={moveProductMaterial}>
                        <input
                          type="hidden"
                          name={adminFormFields.material.id}
                          value={material.id}
                        />
                        <input
                          type="hidden"
                          name={adminFormFields.material.direction}
                          value="up"
                        />
                        <button
                          type="submit"
                          disabled={index === 0}
                          className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                        >
                          Нагоре
                        </button>
                      </form>
                      <form action={moveProductMaterial}>
                        <input
                          type="hidden"
                          name={adminFormFields.material.id}
                          value={material.id}
                        />
                        <input
                          type="hidden"
                          name={adminFormFields.material.direction}
                          value="down"
                        />
                        <button
                          type="submit"
                          disabled={index === groupMaterials.length - 1}
                          className="rounded-full border border-boutique-line px-3 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                        >
                          Надолу
                        </button>
                      </form>
                      <AdminConfirmForm
                        action={deleteProductMaterial}
                        confirmMessage={`Сигурни ли сте, че искате да изтриете „${material.name}"?`}
                      >
                        <input
                          type="hidden"
                          name={adminFormFields.material.id}
                          value={material.id}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700"
                        >
                          Изтрий
                        </button>
                      </AdminConfirmForm>
                    </div>
                  </article>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}
