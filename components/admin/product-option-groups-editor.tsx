"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";
import type { ParsedOptionGroup, ParsedOptionValue } from "@/lib/admin/types";
import {
  calculateOptionFinalPrice,
  formatPriceDelta,
} from "@/lib/product-option-pricing";

type InitialOptionGroup = ParsedOptionGroup;

type LocalValue = ParsedOptionValue & {
  uid: string;
  finalPriceInput: string;
  priceDeltaInput: string;
};
type LocalGroup = Omit<ParsedOptionGroup, "values"> & {
  uid: string;
  values: LocalValue[];
};

type ProductOptionGroupsEditorProps = {
  initialGroups?: InitialOptionGroup[];
  allDependencyOptions: Array<{ id: string; label: string; groupName: string }>;
  basePrice: number;
  helperClassName: string;
  fieldClassName: string;
};

const INPUT_TYPE_LABELS: Record<ParsedOptionGroup["inputType"], string> = {
  single: "Един избор",
  multiple: "Няколко избора",
  text: "Кратък текст",
  textarea: "Дълъг текст",
  date: "Дата",
};

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
};

function makeTechnicalKey(label: string, fallback: string) {
  const transliterated = label
    .trim()
    .toLowerCase()
    .split("")
    .map((character) => CYRILLIC_TO_LATIN[character] ?? character)
    .join("")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);

  return /^[a-z]/.test(transliterated) ? transliterated : fallback;
}

function makeEmptyValue(sortOrder: number, basePrice: number): LocalValue {
  return {
    uid: crypto.randomUUID(),
    finalPriceInput: basePrice.toString(),
    priceDeltaInput: "0",
    id: null,
    label: "",
    key: "",
    priceDelta: 0,
    isDefault: false,
    isActive: true,
    isSoldOut: false,
    sku: null,
    sortOrder,
  };
}

function toLocalGroup(
  group: InitialOptionGroup,
  index: number,
  basePrice: number,
): LocalGroup {
  return {
    ...group,
    uid: group.id ?? crypto.randomUUID(),
    sortOrder: group.sortOrder ?? index,
    values: group.values.map((value, valueIndex) => ({
      ...value,
      uid: value.id ?? crypto.randomUUID(),
      finalPriceInput: calculateOptionFinalPrice(
        basePrice,
        value.priceDelta,
      ).toString(),
      priceDeltaInput: value.priceDelta.toString(),
      sortOrder: value.sortOrder ?? valueIndex,
    })),
  };
}

function makeEmptyGroup(sortOrder: number, basePrice: number): LocalGroup {
  return {
    uid: crypto.randomUUID(),
    id: null,
    name: "",
    key: "",
    inputType: "single",
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder,
    isActive: true,
    pricingMode: "delta",
    dependsOnOptionId: null,
    placeholder: null,
    maxLength: 200,
    textPriceDelta: 0,
    values: [makeEmptyValue(0, basePrice)],
  };
}

function isChoiceType(inputType: ParsedOptionGroup["inputType"]) {
  return inputType === "single" || inputType === "multiple";
}

export function ProductOptionGroupsEditor({
  initialGroups = [],
  allDependencyOptions,
  basePrice: initialBasePrice,
  helperClassName,
  fieldClassName,
}: ProductOptionGroupsEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [basePrice, setBasePrice] = useState(
    Number.isFinite(initialBasePrice) ? initialBasePrice : 0,
  );
  const [groups, setGroups] = useState<LocalGroup[]>(
    initialGroups.length
      ? initialGroups.map((group, index) =>
          toLocalGroup(group, index, initialBasePrice),
        )
      : [],
  );
  const [openUid, setOpenUid] = useState<string | null>(null);

  useEffect(() => {
    const form = editorRef.current?.closest("form");
    const priceInput = form?.elements.namedItem(adminFormFields.product.price);
    if (!(priceInput instanceof HTMLInputElement)) {
      return;
    }

    const syncBasePrice = () => {
      const nextPrice = Number(priceInput.value);
      setBasePrice(Number.isFinite(nextPrice) ? Math.max(0, nextPrice) : 0);
    };

    syncBasePrice();
    priceInput.addEventListener("input", syncBasePrice);
    return () => priceInput.removeEventListener("input", syncBasePrice);
  }, []);

  const preview = useMemo(
    () =>
      groups
        .filter((group) => group.isActive && group.name.trim())
        .map((group) => {
          const valueCount = isChoiceType(group.inputType) ? group.values.length : 0;
          const deltas = isChoiceType(group.inputType)
            ? group.values
                .map((value) => formatPriceDelta(value.priceDelta))
                .filter(Boolean)
                .slice(0, 3)
            : [formatPriceDelta(group.textPriceDelta)].filter(Boolean);
          return `${group.name} (${INPUT_TYPE_LABELS[group.inputType]}, ${valueCount} стойности${deltas.length ? `, ${deltas.join(", ")}` : ""})`;
        }),
    [groups],
  );

  const updateGroup = (uid: string, patch: Partial<LocalGroup>) => {
    setGroups((current) =>
      current.map((group) => {
        if (group.uid !== uid) {
          return group;
        }
        const next = { ...group, ...patch };
        if (patch.inputType) {
          if (patch.inputType === "single") {
            next.minSelect = Math.min(next.minSelect, 1);
            next.maxSelect = 1;
          } else if (patch.inputType === "multiple") {
            next.maxSelect = Math.max(next.maxSelect, 1);
          } else {
            next.minSelect = 0;
            next.maxSelect = 0;
            next.values = [];
          }
        }
        return next;
      }),
    );
  };

  return (
    <div ref={editorRef} className="space-y-4">
      <p className={helperClassName}>
        Добавете група за всеки въпрос към клиента, например „Размер на комплекта“,
        „Оцветяване“ или „Персонализация“. При избор между варианти добавете отделен ред
        за всеки вариант и посочете само доплащането към основната цена.
      </p>

      {preview.length > 0 ? (
        <p className="rounded-lg border border-boutique-line bg-boutique-bg px-3 py-2 text-xs text-boutique-muted">
          Преглед: {preview.join(" · ")}
        </p>
      ) : null}

      {groups.map((group, index) => {
        const isOpen = openUid === group.uid;
        const valueCount = isChoiceType(group.inputType) ? group.values.length : 0;
        return (
          <details
            key={group.uid}
            open={isOpen}
            className="rounded-xl border border-boutique-line bg-white"
            onToggle={(event) => {
              const target = event.currentTarget;
              setOpenUid(target.open ? group.uid : null);
            }}
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-boutique-ink">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {group.name.trim() || `Група ${index + 1}`}
                  <span className="ml-2 text-xs font-normal text-boutique-muted">
                    {INPUT_TYPE_LABELS[group.inputType]} · {valueCount} стойности
                    {!group.isActive ? " · неактивна" : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs text-red-700"
                  onClick={(event) => {
                    event.preventDefault();
                    setGroups((current) => current.filter((item) => item.uid !== group.uid));
                  }}
                >
                  Премахни
                </button>
              </span>
            </summary>

            <div className="space-y-4 border-t border-boutique-line px-4 py-4">
              <input type="hidden" name={adminFormFields.optionGroup.ids} value={group.id ?? ""} />
              <input type="hidden" name={adminFormFields.optionGroup.sortOrders} value={group.sortOrder} />
              <input
                type="hidden"
                name={adminFormFields.optionGroup.active}
                value={group.isActive ? "on" : "off"}
              />
              <input
                type="hidden"
                name={adminFormFields.optionGroup.required}
                value={group.isRequired ? "on" : "off"}
              />
              <input
                type="hidden"
                name={adminFormFields.optionGroup.valuesJson}
                value={JSON.stringify(
                  group.values.map((value) => {
                    const {
                      uid,
                      finalPriceInput,
                      priceDeltaInput,
                      ...rest
                    } = value;
                    void uid;
                    void finalPriceInput;
                    void priceDeltaInput;
                    return group.key === "personalization" &&
                      rest.key === "no"
                      ? { ...rest, priceDelta: 0 }
                      : rest;
                  }),
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-boutique-ink">
                  Какво избира клиентът?
                  <input
                    className={fieldClassName}
                    value={group.name}
                    onChange={(event) => {
                      const name = event.target.value;
                      const previousGeneratedKey = makeTechnicalKey(
                        group.name,
                        `option_${index + 1}`,
                      );
                      updateGroup(group.uid, {
                        name,
                        key:
                          !/^[a-z][a-z0-9_]{0,63}$/.test(group.key) ||
                          group.key === previousGeneratedKey
                            ? makeTechnicalKey(name, `option_${index + 1}`)
                            : group.key,
                      });
                    }}
                    name={adminFormFields.optionGroup.names}
                    placeholder="Напр. Размер на комплекта"
                  />
                  <span className="mt-1 block text-xs font-normal text-boutique-muted">
                    Това заглавие ще се вижда в продуктовата страница.
                  </span>
                </label>
                <label className="text-sm font-medium text-boutique-ink">
                  Как се попълва?
                  <select
                    className={fieldClassName}
                    value={group.inputType}
                    onChange={(event) =>
                      updateGroup(group.uid, {
                        inputType: event.target.value as ParsedOptionGroup["inputType"],
                      })
                    }
                    name={adminFormFields.optionGroup.inputTypes}
                  >
                    {Object.entries(INPUT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-boutique-muted">
                    „Един избор“ е подходящо за размер или вид комплект.
                  </span>
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-boutique-line bg-boutique-bg px-3 py-3 text-sm font-medium text-boutique-ink md:col-span-2">
                  <input
                    type="checkbox"
                    checked={group.isRequired}
                    onChange={(event) =>
                      updateGroup(group.uid, {
                        isRequired: event.target.checked,
                        minSelect: isChoiceType(group.inputType)
                          ? event.target.checked
                            ? Math.max(1, group.minSelect)
                            : 0
                          : 0,
                      })
                    }
                  />
                  Клиентът трябва задължително да попълни тази опция
                </label>
              </div>

              {isChoiceType(group.inputType) ? (
                <>
                  {group.inputType === "single" ? (
                    <>
                      <input
                        type="hidden"
                        name={adminFormFields.optionGroup.minSelects}
                        value={group.isRequired ? "1" : "0"}
                      />
                      <input type="hidden" name={adminFormFields.optionGroup.maxSelects} value="1" />
                    </>
                  ) : null}
                  <input type="hidden" name={adminFormFields.optionGroup.placeholders} value="" />
                  <input type="hidden" name={adminFormFields.optionGroup.maxLengths} value="" />
                  <input type="hidden" name={adminFormFields.optionGroup.textPriceDeltas} value="0" />
                </>
              ) : (
                <>
                  <input type="hidden" name={adminFormFields.optionGroup.minSelects} value="0" />
                  <input type="hidden" name={adminFormFields.optionGroup.maxSelects} value="0" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-medium text-boutique-ink">
                      Подсказка в полето
                      <input
                        className={fieldClassName}
                        value={group.placeholder ?? ""}
                        onChange={(event) =>
                          updateGroup(group.uid, { placeholder: event.target.value || null })
                        }
                        name={adminFormFields.optionGroup.placeholders}
                        placeholder="Напр. Въведете име"
                      />
                    </label>
                    <label className="text-sm font-medium text-boutique-ink">
                      Доплащане, ако полето е попълнено (€)
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={fieldClassName}
                        value={group.textPriceDelta}
                        onChange={(event) =>
                          updateGroup(group.uid, {
                            textPriceDelta: Math.max(0, Number(event.target.value) || 0),
                          })
                        }
                        name={adminFormFields.optionGroup.textPriceDeltas}
                      />
                    </label>
                  </div>
                </>
              )}

              <details className="rounded-lg border border-boutique-line bg-boutique-bg">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-boutique-ink">
                  Разширени настройки
                </summary>
                <div className="grid gap-4 border-t border-boutique-line p-3 md:grid-cols-2">
                  <label className="text-sm font-medium text-boutique-ink">
                    Технически ключ
                    <input
                      className={fieldClassName}
                      value={group.key}
                      onChange={(event) => updateGroup(group.uid, { key: event.target.value })}
                      name={adminFormFields.optionGroup.keys}
                      placeholder={`option_${index + 1}`}
                    />
                    <span className="mt-1 block text-xs font-normal text-boutique-muted">
                      Генерира се автоматично. Променяйте го само при необходимост.
                    </span>
                  </label>

                  <label className="text-sm font-medium text-boutique-ink">
                    Покажи само при избран вариант
                    <select
                      className={fieldClassName}
                      value={group.dependsOnOptionId ?? ""}
                      onChange={(event) =>
                        updateGroup(group.uid, {
                          dependsOnOptionId: event.target.value || null,
                        })
                      }
                      name={adminFormFields.optionGroup.dependsOnOptionIds}
                    >
                      <option value="">Винаги показвай</option>
                      {allDependencyOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.groupName}: {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {group.inputType === "multiple" ? (
                    <>
                      <label className="text-sm font-medium text-boutique-ink">
                        Минимален брой избрани
                        <input
                          type="number"
                          min={0}
                          className={fieldClassName}
                          value={group.minSelect}
                          onChange={(event) =>
                            updateGroup(group.uid, {
                              minSelect: Number(event.target.value) || 0,
                            })
                          }
                          name={adminFormFields.optionGroup.minSelects}
                        />
                      </label>
                      <label className="text-sm font-medium text-boutique-ink">
                        Максимален брой избрани
                        <input
                          type="number"
                          min={1}
                          className={fieldClassName}
                          value={group.maxSelect}
                          onChange={(event) =>
                            updateGroup(group.uid, {
                              maxSelect: Number(event.target.value) || 1,
                            })
                          }
                          name={adminFormFields.optionGroup.maxSelects}
                        />
                      </label>
                    </>
                  ) : null}

                  {!isChoiceType(group.inputType) ? (
                    <label className="text-sm font-medium text-boutique-ink">
                      Максимален брой символи
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        className={fieldClassName}
                        value={group.maxLength ?? 200}
                        onChange={(event) =>
                          updateGroup(group.uid, {
                            maxLength: Number(event.target.value) || null,
                          })
                        }
                        name={adminFormFields.optionGroup.maxLengths}
                      />
                    </label>
                  ) : null}

                  <label className="flex items-center gap-2 text-sm font-medium text-boutique-ink">
                    <input
                      type="checkbox"
                      checked={group.isActive}
                      onChange={(event) =>
                        updateGroup(group.uid, { isActive: event.target.checked })
                      }
                    />
                    Опцията е активна и се вижда от клиентите
                  </label>
                </div>
              </details>

              {isChoiceType(group.inputType) ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-boutique-ink">Варианти за избор</p>
                    <p className="mt-1 text-xs text-boutique-muted">
                      Основната цена на продукта остава базовата цена.
                      За всеки вариант въведете само сумата за доплащане към нея.
                    </p>
                  </div>
                  {group.values.map((value, valueIndex) => (
                    <div
                      key={value.uid}
                      className="rounded-xl border border-boutique-line bg-boutique-bg p-3"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
                        <label className="text-sm font-medium text-boutique-ink">
                          Име на варианта
                          <input
                            className={fieldClassName}
                            placeholder="Напр. Мини – 3 фигурки"
                            value={value.label}
                            onChange={(event) => {
                              const label = event.target.value;
                              const fallback = `variant_${valueIndex + 1}`;
                              const previousGeneratedKey = makeTechnicalKey(
                                value.label,
                                fallback,
                              );
                              const nextValues = group.values.map((item) =>
                                item.uid === value.uid
                                  ? {
                                      ...item,
                                      label,
                                      key:
                                        !/^[a-z][a-z0-9_]{0,63}$/.test(item.key) ||
                                        item.key === previousGeneratedKey
                                          ? makeTechnicalKey(label, fallback)
                                          : item.key,
                                    }
                                  : item,
                              );
                              updateGroup(group.uid, { values: nextValues });
                            }}
                          />
                        </label>
                        <label className="text-sm font-medium text-boutique-ink">
                          {group.key === "personalization" && value.key === "yes"
                            ? "Доплащане (€)"
                            : group.key === "personalization" && value.key === "no"
                              ? "Доплащане (€)"
                              : "Доплащане (€)"}
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={fieldClassName}
                            disabled={
                              group.key === "personalization" &&
                              value.key === "no"
                            }
                            value={
                              group.key === "personalization" &&
                              value.key === "yes"
                                ? value.priceDeltaInput
                                : group.key === "personalization" &&
                                    value.key === "no"
                                  ? "0"
                                  : value.priceDeltaInput
                            }
                            onChange={(event) => {
                              const rawInput = event.target.value;
                              const parsedPrice = Number(rawInput);
                              const nextValues = group.values.map((item) =>
                                item.uid === value.uid
                                  ? {
                                      ...item,
                                      priceDeltaInput: rawInput,
                                      ...(rawInput.trim() &&
                                      Number.isFinite(parsedPrice)
                                        ? {
                                            priceDelta: Math.max(0, parsedPrice),
                                            finalPriceInput: calculateOptionFinalPrice(
                                              basePrice,
                                              parsedPrice,
                                            ).toString(),
                                          }
                                        : {}),
                                    }
                                  : item,
                              );
                              updateGroup(group.uid, { values: nextValues });
                            }}
                            onBlur={() => {
                              if (value.priceDeltaInput.trim()) {
                                return;
                              }
                              const nextValues = group.values.map((item) =>
                                item.uid === value.uid
                                  ? {
                                      ...item,
                                      priceDeltaInput: item.priceDelta.toString(),
                                    }
                                  : item,
                              );
                              updateGroup(group.uid, { values: nextValues });
                            }}
                          />
                          <span className="mt-1 block text-xs font-normal text-boutique-muted">
                            {group.key === "personalization" &&
                            value.key === "yes"
                              ? "Въведете само сумата, която се добавя към избрания вариант."
                              : group.key === "personalization" &&
                                  value.key === "no"
                                ? "Без доплащане"
                                : "0 означава без доплащане"}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="min-h-11 rounded-lg border border-red-200 px-3 text-sm text-red-700"
                          onClick={() =>
                            updateGroup(group.uid, {
                              values: group.values.filter((item) => item.uid !== value.uid),
                            })
                          }
                        >
                          Премахни
                        </button>
                      </div>

                      <label className="mt-3 flex items-center gap-2 text-sm text-boutique-ink">
                        <input
                          type="checkbox"
                          checked={value.isDefault}
                          onChange={(event) => {
                            const nextValues = group.values.map((item) =>
                              item.uid === value.uid
                                ? { ...item, isDefault: event.target.checked }
                                : group.inputType === "single" && event.target.checked
                                  ? { ...item, isDefault: false }
                                  : item,
                            );
                            updateGroup(group.uid, { values: nextValues });
                          }}
                        />
                        Предварително избран вариант
                      </label>

                      <details className="mt-3 border-t border-boutique-line pt-2">
                        <summary className="cursor-pointer text-xs font-medium text-boutique-muted">
                          Настройки на варианта
                        </summary>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-xs font-medium text-boutique-ink">
                            Технически ключ
                            <input
                              className={fieldClassName}
                              value={value.key}
                              onChange={(event) => {
                                const nextValues = group.values.map((item) =>
                                  item.uid === value.uid
                                    ? { ...item, key: event.target.value }
                                    : item,
                                );
                                updateGroup(group.uid, { values: nextValues });
                              }}
                            />
                          </label>
                          <label className="text-xs font-medium text-boutique-ink">
                            SKU (по желание)
                            <input
                              className={fieldClassName}
                              value={value.sku ?? ""}
                              onChange={(event) => {
                                const nextValues = group.values.map((item) =>
                                  item.uid === value.uid
                                    ? { ...item, sku: event.target.value || null }
                                    : item,
                                );
                                updateGroup(group.uid, { values: nextValues });
                              }}
                            />
                          </label>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs">
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={value.isActive}
                              onChange={(event) => {
                                const nextValues = group.values.map((item) =>
                                  item.uid === value.uid
                                    ? { ...item, isActive: event.target.checked }
                                    : item,
                                );
                                updateGroup(group.uid, { values: nextValues });
                              }}
                            />
                            Вариантът е активен
                          </label>
                          <label className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={value.isSoldOut}
                            onChange={(event) => {
                              const nextValues = group.values.map((item) =>
                                item.uid === value.uid
                                  ? { ...item, isSoldOut: event.target.checked }
                                  : item,
                              );
                              updateGroup(group.uid, { values: nextValues });
                            }}
                          />
                            Изчерпан
                        </label>
                        </div>
                      </details>
                      <input type="hidden" value={value.id ?? ""} readOnly />
                      <input type="hidden" value={valueIndex} readOnly />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="rounded-lg border border-boutique-line px-3 py-2 text-xs font-semibold"
                    onClick={() =>
                      updateGroup(group.uid, {
                        values: [
                          ...group.values,
                          makeEmptyValue(group.values.length, basePrice),
                        ],
                      })
                    }
                  >
                    + Добави вариант
                  </button>
                </div>
              ) : null}
            </div>
          </details>
        );
      })}

      <button
        type="button"
        className="rounded-lg border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
        onClick={() =>
          setGroups((current) => [
            ...current,
            makeEmptyGroup(current.length, basePrice),
          ])
        }
      >
        + Добави нова опция
      </button>
    </div>
  );
}
