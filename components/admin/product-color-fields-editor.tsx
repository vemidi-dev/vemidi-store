"use client";

import { useMemo, useState } from "react";

import {
  areAllColorFieldOptionsSelected,
  getColorFieldOptionIds,
} from "@/lib/admin/color-field-option-bulk";
import { adminFormFields } from "@/lib/admin/form-fields";

type ColorGroup = {
  id: string;
  key: string;
  label: string;
};

type ColorOption = {
  id: string;
  group_id: string;
  name: string;
  hex: string | null;
};

type InitialColorField = {
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
  selectionMode?: "choice" | "quantity";
  requiredTotalQuantity?: number | null;
};

type ProductColorFieldsEditorProps = {
  colorGroups: ColorGroup[];
  colorOptions: ColorOption[];
  initialFields?: InitialColorField[];
  helperClassName: string;
  fieldClassName: string;
};

type LocalColorField = {
  uid: string;
  label: string;
  groupId: string;
  minSelect: number;
  maxSelect: number;
  optionIds: string[];
  selectionMode: "choice" | "quantity";
  requiredTotalQuantity: number;
};

function makeEmptyField(groupId: string): LocalColorField {
  return {
    uid: crypto.randomUUID(),
    label: "",
    groupId,
    minSelect: 1,
    maxSelect: 1,
    optionIds: [],
    selectionMode: "choice",
    requiredTotalQuantity: 12,
  };
}

export function ProductColorFieldsEditor({
  colorGroups,
  colorOptions,
  initialFields = [],
  helperClassName,
  fieldClassName,
}: ProductColorFieldsEditorProps) {
  const defaultGroupId = colorGroups[0]?.id ?? "";
  const [fields, setFields] = useState<LocalColorField[]>(
    initialFields.length > 0
      ? initialFields.map((field) => ({
          uid: crypto.randomUUID(),
          label: field.label,
          groupId: field.groupId,
          minSelect: field.minSelect,
          maxSelect: field.maxSelect,
          optionIds: field.optionIds,
          selectionMode: field.selectionMode === "quantity" ? "quantity" : "choice",
          requiredTotalQuantity:
            field.selectionMode === "quantity"
              ? Math.max(1, field.requiredTotalQuantity ?? 12)
              : 12,
        }))
      : [],
  );

  const optionsByGroupId = useMemo(() => {
    const map = new Map<string, ColorOption[]>();
    colorOptions.forEach((option) => {
      const list = map.get(option.group_id) ?? [];
      list.push(option);
      map.set(option.group_id, list);
    });
    return map;
  }, [colorOptions]);

  if (colorGroups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-boutique-line p-4">
        <p className={helperClassName}>
          Няма създадени цветови палитри. Добавете ги първо от таб „Цветове“.
        </p>
        <a
          href="/admin?tab=colors"
          className="mt-3 inline-flex rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold text-boutique-ink"
        >
          Към цветовите палитри
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => {
        const options = optionsByGroupId.get(field.groupId) ?? [];
        const selectedCount = field.optionIds.length;

        return (
          <fieldset
            key={field.uid}
            className="space-y-3 rounded-lg border border-boutique-line/70 bg-boutique-bg p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <legend className="text-sm font-semibold text-boutique-ink">
                Избор на цвят #{index + 1}
              </legend>
              <button
                type="button"
                onClick={() => setFields((prev) => prev.filter((item) => item.uid !== field.uid))}
                className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
              >
                Премахни
              </button>
            </div>

            <label className="text-sm font-medium text-boutique-ink">
              Какво избира клиентът?
              <input
                name={adminFormFields.colorField.labels}
                defaultValue={field.label}
                placeholder="Напр. Цвят на панделката"
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-medium text-boutique-ink">
              Използвай палитра
              <select
                value={field.groupId}
                onChange={(event) => {
                  const groupId = event.currentTarget.value;
                  setFields((prev) =>
                    prev.map((item) =>
                      item.uid === field.uid ? { ...item, groupId, optionIds: [] } : item,
                    ),
                  );
                }}
                className={fieldClassName}
              >
                {colorGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2 self-end rounded-lg border border-boutique-line bg-white px-3 py-3 text-sm text-boutique-ink">
              <input
                type="checkbox"
                checked={field.selectionMode === "quantity"}
                onChange={(event) => {
                  const quantityMode = event.currentTarget.checked;
                  setFields((prev) =>
                    prev.map((item) =>
                      item.uid === field.uid
                        ? {
                            ...item,
                            selectionMode: quantityMode ? "quantity" : "choice",
                            minSelect: quantityMode ? 1 : item.minSelect,
                            maxSelect: quantityMode ? 1 : item.maxSelect,
                          }
                        : item,
                    ),
                  );
                }}
              />
              Цветове с количества
            </label>

            {field.selectionMode === "quantity" ? (
              <label className="text-sm font-medium text-boutique-ink">
                Общ брой елементи
                <input
                  type="number"
                  min="1"
                  max="99"
                  name={adminFormFields.colorField.requiredTotalQuantities}
                  defaultValue={field.requiredTotalQuantity}
                  className={fieldClassName}
                />
                <span className={helperClassName}>
                  Клиентът разпределя този брой между наличните цветове.
                </span>
              </label>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="inline-flex items-center gap-2 self-end rounded-lg border border-boutique-line bg-white px-3 py-3 text-sm text-boutique-ink">
                  <input
                    type="checkbox"
                    checked={field.minSelect > 0}
                    onChange={(event) => {
                      const minSelect = event.currentTarget.checked ? 1 : 0;
                      setFields((prev) =>
                        prev.map((item) =>
                          item.uid === field.uid ? { ...item, minSelect } : item,
                        ),
                      );
                    }}
                  />
                  Изборът е задължителен
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Брой цветове
                  <select
                    value={field.maxSelect > 1 ? "multiple" : "single"}
                    onChange={(event) => {
                      const maxSelect =
                        event.currentTarget.value === "multiple" ? 2 : 1;
                      setFields((prev) =>
                        prev.map((item) =>
                          item.uid === field.uid ? { ...item, maxSelect } : item,
                        ),
                      );
                    }}
                    className={fieldClassName}
                  >
                    <option value="single">Един цвят</option>
                    <option value="multiple">Няколко цвята</option>
                  </select>
                </label>
              </div>
            )}

            {field.selectionMode === "choice" && field.maxSelect > 1 ? (
              <label className="block max-w-xs text-sm font-medium text-boutique-ink">
                Най-много избрани цветове
                <input
                  type="number"
                  min="2"
                  max={Math.max(2, field.optionIds.length)}
                  value={field.maxSelect}
                  onChange={(event) => {
                    const maxSelect = Math.max(
                      2,
                      Math.min(
                        field.optionIds.length || 2,
                        Number(event.currentTarget.value) || 2,
                      ),
                    );
                    setFields((prev) =>
                      prev.map((item) =>
                        item.uid === field.uid ? { ...item, maxSelect } : item,
                      ),
                    );
                  }}
                  className={fieldClassName}
                />
                <span className={helperClassName}>
                  Използвайте това само когато клиентът може да комбинира цветове.
                </span>
              </label>
            ) : null}

            {options.length === 0 ? (
              <p className={helperClassName}>Няма активни цветове за тази категория.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-boutique-muted">
                    Кои цветове са налични за продукта? ({selectedCount} избрани)
                  </p>
                  <button
                    type="button"
                    disabled={options.length === 0}
                    onClick={() => {
                      const allSelected = areAllColorFieldOptionsSelected(
                        options,
                        field.optionIds,
                      );
                      const nextOptionIds = allSelected
                        ? []
                        : getColorFieldOptionIds(options);
                      setFields((prev) =>
                        prev.map((item) => {
                          if (item.uid !== field.uid) {
                            return item;
                          }

                          return {
                            ...item,
                            optionIds: nextOptionIds,
                            maxSelect:
                              item.maxSelect > 1
                                ? Math.max(2, Math.min(item.maxSelect, nextOptionIds.length || 2))
                                : item.maxSelect,
                          };
                        }),
                      );
                    }}
                    className="shrink-0 rounded-full border border-boutique-line bg-white px-3 py-1 text-[11px] font-semibold text-boutique-ink transition hover:border-boutique-sage-deep hover:text-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
                  >
                    {areAllColorFieldOptionsSelected(options, field.optionIds)
                      ? "Премахване на всички"
                      : "Избор на всички"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {options.map((option) => {
                    const checked = field.optionIds.includes(option.id);
                    return (
                      <label
                        key={`${field.uid}-${option.id}`}
                        className={`cursor-pointer rounded-xl border p-2 text-center text-xs transition ${
                          checked
                            ? "border-boutique-sage-deep bg-white shadow-sm"
                            : "border-boutique-line bg-white/60 opacity-75 hover:opacity-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            const isChecked = event.currentTarget.checked;
                            setFields((prev) =>
                              prev.map((item) => {
                                if (item.uid !== field.uid) {
                                  return item;
                                }
                                if (isChecked) {
                                  if (item.optionIds.includes(option.id)) {
                                    return item;
                                  }
                                  return { ...item, optionIds: [...item.optionIds, option.id] };
                                }
                                return {
                                  ...item,
                                  optionIds: item.optionIds.filter((id) => id !== option.id),
                                  maxSelect:
                                    item.maxSelect > 1
                                      ? Math.max(
                                          2,
                                          Math.min(
                                            item.maxSelect,
                                            item.optionIds.length - 1,
                                          ),
                                        )
                                      : 1,
                                };
                              }),
                            );
                          }}
                          className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                        />
                        {option.hex ? (
                          <span
                            aria-hidden
                            className="mx-auto block h-10 w-10 rounded-full border border-boutique-line shadow-inner"
                            style={{ backgroundColor: option.hex }}
                          />
                        ) : null}
                        <span className="mt-1 block max-w-20">{option.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <input type="hidden" name={adminFormFields.colorField.groupIds} value={field.groupId} />
            <input
              type="hidden"
              name={adminFormFields.colorField.minSelects}
              value={String(field.selectionMode === "quantity" ? 1 : field.minSelect)}
            />
            <input
              type="hidden"
              name={adminFormFields.colorField.maxSelects}
              value={String(field.selectionMode === "quantity" ? 1 : field.maxSelect)}
            />
            <input type="hidden" name={adminFormFields.colorField.optionIds} value={field.optionIds.join(",")} />
            <input
              type="hidden"
              name={adminFormFields.colorField.selectionModes}
              value={field.selectionMode}
            />
            {field.selectionMode === "choice" ? (
              <input
                type="hidden"
                name={adminFormFields.colorField.requiredTotalQuantities}
                value=""
              />
            ) : null}
          </fieldset>
        );
      })}

      <button
        type="button"
        onClick={() =>
          setFields((prev) => [...prev, makeEmptyField(prev[0]?.groupId ?? defaultGroupId)])
        }
        className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/40"
      >
        + Добави избор на цвят
      </button>
    </div>
  );
}
