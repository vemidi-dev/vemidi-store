import {
  createColorGroup,
  createColorOption,
  deleteColorGroup,
  deleteColorOption,
  moveColorOption,
  updateColorGroup,
  updateColorOption,
} from "@/app/admin/color-actions";
import { AdminSectionAccordion } from "@/components/admin/admin-section-accordion";
import {
  adminFieldClass,
  adminHelperClass,
  adminPanelClass,
  adminTableHeadClass,
} from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { ColorGroupRow, ColorOptionRow } from "@/lib/admin/types";

function colorCountLabel(count: number): string {
  if (count === 1) {
    return "1 цвят";
  }
  return `${count} цвята`;
}

function PalettePreview({ options }: { options: ColorOptionRow[] }) {
  const preview = options.slice(0, 8);

  if (preview.length === 0) {
    return <span className="text-xs text-boutique-muted">Няма цветове</span>;
  }

  return (
    <span className="flex items-center gap-1" aria-hidden>
      {preview.map((option) => (
        <span
          key={option.id}
          className="h-4 w-4 rounded-full border border-boutique-line/80"
          style={{ backgroundColor: option.hex || "#E5E1DC" }}
          title={option.name}
        />
      ))}
      {options.length > preview.length ? (
        <span className="text-[10px] text-boutique-muted">+{options.length - preview.length}</span>
      ) : null}
    </span>
  );
}

export function ColorManagementPanel({
  groups,
  options,
}: {
  groups: ColorGroupRow[];
  options: ColorOptionRow[];
}) {
  return (
    <div className="space-y-6">
      <article className={adminPanelClass}>
        <h2 className="font-heading text-2xl text-boutique-ink">
          Палитри за продукти
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
          Всяка палитра е сгъната по подразбиране. Отворете само тази, която редактирате.
        </p>

        <form
          action={createColorGroup}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
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
          <button className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white">
            Добави палитра
          </button>
        </form>
      </article>

      {groups.length === 0 ? (
        <p className="text-sm text-boutique-muted">Все още няма създадени палитри.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const groupOptions = options
              .filter((option) => option.group_id === group.id)
              .sort((left, right) => {
                const difference = (left.sort_order ?? 0) - (right.sort_order ?? 0);
                return difference || left.name.localeCompare(right.name, "bg");
              });

            return (
              <AdminSectionAccordion
                key={group.id}
                title={group.label}
                countLabel={colorCountLabel(groupOptions.length)}
                trailing={<PalettePreview options={groupOptions} />}
                className="!rounded-xl"
              >
                <div className="mb-4 flex flex-wrap justify-end gap-2">
                    <form action={updateColorGroup} className="flex gap-2">
                      <input
                        type="hidden"
                        name={adminFormFields.colorPalette.groupId}
                        value={group.id}
                      />
                      <input
                        name={adminFormFields.colorPalette.label}
                        defaultValue={group.label}
                        required
                        className={`${adminFieldClass} !mt-0 max-w-xs`}
                      />
                      <button className="rounded-full border border-boutique-line px-3 py-2 text-xs font-semibold">
                        Преименувай
                      </button>
                    </form>
                    <form action={deleteColorGroup}>
                      <input
                        type="hidden"
                        name={adminFormFields.colorPalette.groupId}
                        value={group.id}
                      />
                      <button className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
                        Изтрий палитрата
                      </button>
                    </form>
                </div>

                <form
                  action={createColorOption}
                  className="grid gap-2 rounded-lg border border-boutique-line bg-boutique-bg/60 p-3 sm:grid-cols-[1fr_5rem_auto]"
                >
                  <input
                    type="hidden"
                    name={adminFormFields.colorPalette.groupId}
                    value={group.id}
                  />
                  <label className="text-xs font-medium text-boutique-ink">
                    Име на цвят
                    <input
                      name={adminFormFields.colorPalette.name}
                      required
                      placeholder="Напр. Пудрено розово"
                      className={`${adminFieldClass} !mt-1 !py-2`}
                    />
                  </label>
                  <label className="text-xs font-medium text-boutique-ink">
                    Hex
                    <input
                      name={adminFormFields.colorPalette.hex}
                      type="color"
                      defaultValue="#D9B8B0"
                      className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-boutique-line bg-white p-0.5"
                    />
                  </label>
                  <button className="self-end rounded-full bg-boutique-sage-deep px-4 py-2 text-xs font-semibold text-white">
                    + Цвят
                  </button>
                </form>

                {groupOptions.length === 0 ? (
                  <p className={`${adminHelperClass} mt-3`}>
                    В тази палитра все още няма цветове.
                  </p>
                ) : (
                  <div className="mt-3 overflow-hidden rounded-lg border border-boutique-line">
                    <div
                      className={`${adminTableHeadClass} hidden px-2 py-1.5 sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_5rem_4rem_auto] sm:gap-2`}
                      aria-hidden
                    >
                      <span />
                      <span>Име</span>
                      <span>Статус</span>
                      <span>Ред</span>
                      <span />
                    </div>
                    {groupOptions.map((option, index) => (
                      <div
                        key={option.id}
                        className="flex flex-wrap items-center gap-2 border-b border-boutique-line/60 bg-white px-2 py-1.5 last:border-b-0"
                      >
                        <form
                          action={updateColorOption}
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                        >
                          <input
                            type="hidden"
                            name={adminFormFields.colorPalette.optionId}
                            value={option.id}
                          />
                          <input
                            name={adminFormFields.colorPalette.hex}
                            type="color"
                            defaultValue={option.hex || "#E5E1DC"}
                            aria-label={`Цвят за ${option.name}`}
                            className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-boutique-line bg-white p-0.5"
                          />
                          <input
                            name={adminFormFields.colorPalette.name}
                            defaultValue={option.name}
                            required
                            className={`${adminFieldClass} !mt-0 min-w-[8rem] flex-1 !py-1.5 !text-xs`}
                          />
                          <label className="flex items-center gap-1.5 text-[11px] text-boutique-muted">
                            <input
                              name="is_active"
                              type="checkbox"
                              defaultChecked={option.is_active}
                              className="h-3.5 w-3.5 rounded border-boutique-line"
                            />
                            Активен
                          </label>
                          <button
                            type="submit"
                            className="rounded-full border border-boutique-sage-deep/30 px-2.5 py-1 text-[11px] font-semibold text-boutique-sage-deep"
                          >
                            Запази
                          </button>
                        </form>
                        <div className="flex gap-1">
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
                                className="rounded-full border border-boutique-line px-2 py-0.5 text-[10px] disabled:opacity-35"
                              >
                                {direction === "up" ? "←" : "→"}
                              </button>
                            </form>
                          ))}
                          <form action={deleteColorOption}>
                            <input
                              type="hidden"
                              name={adminFormFields.colorPalette.optionId}
                              value={option.id}
                            />
                            <button className="rounded-full border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                              Изтрий
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AdminSectionAccordion>
            );
          })}
        </div>
      )}
    </div>
  );
}
