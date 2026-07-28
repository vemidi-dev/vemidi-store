import {
  createProductMaterial,
  deleteProductMaterial,
  moveProductMaterial,
  updateProductMaterial,
} from "@/app/admin/material-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductMaterialRow } from "@/lib/admin/types";

export function MaterialManagementPanel({
  materials,
  loadError,
}: {
  materials: ProductMaterialRow[];
  loadError?: string | null;
}) {
  const sorted = [...materials].sort((left, right) => {
    const byOrder = left.sort_order - right.sort_order;
    return byOrder || left.name.localeCompare(right.name, "bg");
  });

  return (
    <div className="space-y-6">
      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">Материали</h2>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
          Визуална библиотека за материали/текстури. На този етап се управлява само
          списъкът — свързването с продуктови варианти идва в следваща стъпка.
        </p>

        <form
          action={createProductMaterial}
          encType="multipart/form-data"
          className="mt-5 grid gap-3 md:grid-cols-2"
        >
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
              placeholder="Кратка бележка за админ/бъдещ UI"
              className={`${adminFieldClass} resize-y`}
            />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
              Добави материал
            </button>
          </div>
        </form>
      </article>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {sorted.length === 0 && !loadError ? (
        <p className="text-sm text-boutique-muted">Все още няма добавени материали.</p>
      ) : (
        <div className="space-y-3">
          {sorted.map((material, index) => (
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
                    Активен (видим за бъдещ UI)
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
                    disabled={index === sorted.length - 1}
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
          ))}
        </div>
      )}
    </div>
  );
}
