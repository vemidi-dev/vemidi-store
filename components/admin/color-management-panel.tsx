import {
  createColorGroup,
  createColorOption,
  deleteColorGroup,
  moveColorOption,
  updateColorGroup,
  updateColorOption,
} from "@/app/admin/color-actions";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { ColorGroupRow, ColorOptionRow } from "@/lib/admin/types";

export function ColorManagementPanel({
  groups,
  options,
}: {
  groups: ColorGroupRow[];
  options: ColorOptionRow[];
}) {
  return (
    <div className="space-y-8">
      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">
          Палитри за продукти
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
          Създайте палитри като „Дърво“, „Панделки“ или „Надпис“. После към
          всеки продукт избирате кои от готовите цветове са разрешени.
        </p>

        <form
          action={createColorGroup}
          className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm font-medium text-boutique-ink">
            Име на нова палитра
            <input
              name={adminFormFields.colorPalette.label}
              required
              placeholder="Напр. Панделки"
              className={adminFieldClass}
            />
          </label>
          <button className="rounded-full bg-boutique-ink px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white">
            Добави палитра
          </button>
        </form>
      </article>

      {groups.map((group) => {
        const groupOptions = options
          .filter((option) => option.group_id === group.id)
          .sort((a, b) => {
            const difference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
            return difference || a.name.localeCompare(b.name, "bg");
          });

        return (
          <article key={group.id} className={adminPanelClass}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <form action={updateColorGroup} className="flex flex-1 gap-2">
                <input
                  type="hidden"
                  name={adminFormFields.colorPalette.groupId}
                  value={group.id}
                />
                <input
                  name={adminFormFields.colorPalette.label}
                  defaultValue={group.label}
                  required
                  className={adminFieldClass}
                />
                <button className="self-end rounded-full border border-boutique-line px-4 py-2.5 text-xs font-semibold">
                  Запази име
                </button>
              </form>
              <form action={deleteColorGroup}>
                <input
                  type="hidden"
                  name={adminFormFields.colorPalette.groupId}
                  value={group.id}
                />
                <button className="rounded-full border border-red-200 px-4 py-2.5 text-xs font-semibold text-red-700">
                  Изтрий палитрата
                </button>
              </form>
            </div>

            <form
              action={createColorOption}
              className="mt-6 grid gap-3 rounded-xl border border-boutique-line bg-boutique-bg p-4 sm:grid-cols-[1fr_8rem_auto]"
            >
              <input
                type="hidden"
                name={adminFormFields.colorPalette.groupId}
                value={group.id}
              />
              <label className="text-sm font-medium text-boutique-ink">
                Име на цвят
                <input
                  name={adminFormFields.colorPalette.name}
                  required
                  placeholder="Напр. Пудрено розово"
                  className={adminFieldClass}
                />
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Цвят
                <input
                  name={adminFormFields.colorPalette.hex}
                  type="color"
                  defaultValue="#D9B8B0"
                  className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-boutique-line bg-white p-1"
                />
              </label>
              <button className="self-end rounded-full bg-boutique-sage-deep px-5 py-3 text-xs font-semibold text-white">
                Добави цвят
              </button>
            </form>

            {groupOptions.length === 0 ? (
              <p className={adminHelperClass}>
                В тази палитра все още няма цветове.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {groupOptions.map((option, index) => (
                  <article
                    key={option.id}
                    className="rounded-xl border border-boutique-line bg-white p-4"
                  >
                    <form action={updateColorOption} className="grid gap-3">
                      <input
                        type="hidden"
                        name={adminFormFields.colorPalette.optionId}
                        value={option.id}
                      />
                      <div className="grid grid-cols-[3rem_1fr] items-end gap-3">
                        <input
                          name={adminFormFields.colorPalette.hex}
                          type="color"
                          defaultValue={option.hex || "#E5E1DC"}
                          aria-label={`Цвят за ${option.name}`}
                          className="h-11 w-12 cursor-pointer rounded-lg border border-boutique-line bg-white p-1"
                        />
                        <label className="text-sm font-medium text-boutique-ink">
                          Име
                          <input
                            name={adminFormFields.colorPalette.name}
                            defaultValue={option.name}
                            required
                            className={adminFieldClass}
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-boutique-muted">
                          <input
                            name="is_active"
                            type="checkbox"
                            defaultChecked={option.is_active}
                          />
                          Активен
                        </label>
                        <button className="text-xs font-semibold text-boutique-sage-deep">
                          Запази
                        </button>
                      </div>
                    </form>
                    <div className="mt-3 flex gap-2 border-t border-boutique-line pt-3">
                      {(["up", "down"] as const).map((direction) => (
                        <form action={moveColorOption} key={direction}>
                          <input
                            type="hidden"
                            name={adminFormFields.colorPalette.optionId}
                            value={option.id}
                          />
                          <input
                            type="hidden"
                            name={adminFormFields.colorPalette.direction}
                            value={direction}
                          />
                          <button
                            disabled={
                              direction === "up"
                                ? index === 0
                                : index === groupOptions.length - 1
                            }
                            className="rounded-full border border-boutique-line px-3 py-1.5 text-xs disabled:opacity-35"
                          >
                            {direction === "up" ? "Наляво" : "Надясно"}
                          </button>
                        </form>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
