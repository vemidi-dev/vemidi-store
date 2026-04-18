"use client";

import { useMemo, useState } from "react";

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
};

function makeEmptyField(groupId: string): LocalColorField {
  return {
    uid: crypto.randomUUID(),
    label: "",
    groupId,
    minSelect: 0,
    maxSelect: 1,
    optionIds: [],
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
        }))
      : defaultGroupId
        ? [makeEmptyField(defaultGroupId)]
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
      <p className={helperClassName}>
        Няма дефинирани цветови групи. Пуснете SQL за color groups / color options.
      </p>
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
                Цветово поле #{index + 1}
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
              Лейбъл на полето
              <input
                value={field.label}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFields((prev) =>
                    prev.map((item) => (item.uid === field.uid ? { ...item, label: value } : item)),
                  );
                }}
                placeholder="Напр. Цвят на хартия"
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-medium text-boutique-ink">
              Категория цветове
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

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-boutique-ink">
                Минимум избори
                <input
                  type="number"
                  min="0"
                  value={field.minSelect}
                  onChange={(event) => {
                    const minSelect = Math.max(0, Number(event.currentTarget.value) || 0);
                    setFields((prev) =>
                      prev.map((item) => (item.uid === field.uid ? { ...item, minSelect } : item)),
                    );
                  }}
                  className={fieldClassName}
                />
              </label>
              <label className="text-sm font-medium text-boutique-ink">
                Максимум избори
                <input
                  type="number"
                  min="1"
                  value={field.maxSelect}
                  onChange={(event) => {
                    const maxSelect = Math.max(1, Number(event.currentTarget.value) || 1);
                    setFields((prev) =>
                      prev.map((item) => (item.uid === field.uid ? { ...item, maxSelect } : item)),
                    );
                  }}
                  className={fieldClassName}
                />
              </label>
            </div>

            {options.length === 0 ? (
              <p className={helperClassName}>Няма активни цветове за тази категория.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-boutique-muted">
                  Разрешени цветове ({selectedCount} избрани)
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {options.map((option) => {
                    const checked = field.optionIds.includes(option.id);
                    return (
                      <label
                        key={`${field.uid}-${option.id}`}
                        className="inline-flex items-center gap-2 text-sm text-boutique-ink"
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
                                };
                              }),
                            );
                          }}
                          className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                        />
                        <span>{option.name}</span>
                        {option.hex ? (
                          <span
                            aria-hidden
                            className="h-4 w-4 rounded-full border border-boutique-line"
                            style={{ backgroundColor: option.hex }}
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <input type="hidden" name="color_field_label[]" value={field.label} />
            <input type="hidden" name="color_field_group_id[]" value={field.groupId} />
            <input type="hidden" name="color_field_min_select[]" value={String(field.minSelect)} />
            <input type="hidden" name="color_field_max_select[]" value={String(field.maxSelect)} />
            <input type="hidden" name="color_field_option_ids[]" value={field.optionIds.join(",")} />
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
        + Добави цветово поле
      </button>
    </div>
  );
}
