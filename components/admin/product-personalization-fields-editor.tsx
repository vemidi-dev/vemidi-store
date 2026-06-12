"use client";

import { useState } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductDraftPersonalizationField } from "@/lib/admin/types";

type LocalField = ProductDraftPersonalizationField & {
  uid: string;
  priceDeltaInput: string;
};

type Props = {
  initialFields?: ProductDraftPersonalizationField[];
  helperClassName: string;
  fieldClassName: string;
};

function makeField(): LocalField {
  const uid = crypto.randomUUID();
  return {
    uid,
    label: "",
    key: `field_${uid.replaceAll("-", "")}`,
    type: "text",
    placeholder: "",
    maxLength: 100,
    priceDelta: 0,
    priceDeltaInput: "0",
    required: false,
    allowsWishTemplates: false,
  };
}

export function ProductPersonalizationFieldsEditor({
  initialFields = [],
  helperClassName,
  fieldClassName,
}: Props) {
  const [fields, setFields] = useState<LocalField[]>(() =>
    initialFields.map((field) => ({
      ...field,
      uid: crypto.randomUUID(),
      priceDeltaInput: field.priceDelta.toString(),
    })),
  );

  return (
    <div className="space-y-4">
      <div>
        <p className={helperClassName}>
          Добавете отделно поле за всяка информация, която клиентът трябва да
          въведе, например име, дата или текст за картичка.
        </p>
      </div>

      {fields.map((field, index) => (
        <fieldset
          key={field.uid}
          className="space-y-4 rounded-lg border border-boutique-line/70 bg-boutique-bg p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <legend className="text-sm font-semibold text-boutique-ink">
              Поле #{index + 1}
            </legend>
            <button
              type="button"
              onClick={() =>
                setFields((current) =>
                  current.filter((item) => item.uid !== field.uid),
                )
              }
              className="rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-red-700 transition hover:bg-red-50"
            >
              Премахни
            </button>
          </div>

          <input
            type="hidden"
            name={adminFormFields.personalizationField.keys}
            value={field.key}
          />
          <input
            type="hidden"
            name={adminFormFields.personalizationField.required}
            value={field.required ? "1" : "0"}
          />
          <input
            type="hidden"
            name={adminFormFields.personalizationField.allowsWishes}
            value={field.allowsWishTemplates ? "1" : "0"}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-boutique-ink">
              Какво въвежда клиентът?
              <input
                name={adminFormFields.personalizationField.labels}
                value={field.label}
                required
                onChange={(event) => {
                  const label = event.currentTarget.value;
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid ? { ...item, label } : item,
                    ),
                  );
                }}
                placeholder="Напр. Име на детето"
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-medium text-boutique-ink">
              Вид на полето
              <select
                name={adminFormFields.personalizationField.types}
                value={field.type}
                onChange={(event) => {
                  const type = event.currentTarget.value as LocalField["type"];
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid
                        ? {
                            ...item,
                            type,
                            maxLength:
                              type === "date"
                                ? 10
                                : type === "textarea"
                                  ? Math.max(item.maxLength, 500)
                                  : Math.min(item.maxLength, 100),
                            allowsWishTemplates:
                              type === "textarea"
                                ? item.allowsWishTemplates
                                : false,
                          }
                        : item,
                    ),
                  );
                }}
                className={fieldClassName}
              >
                <option value="text">Кратък текст</option>
                <option value="textarea">По-дълъг текст</option>
                <option value="date">Дата</option>
              </select>
            </label>

            <label className="text-sm font-medium text-boutique-ink">
              Подсказка в полето
              <input
                name={adminFormFields.personalizationField.placeholders}
                value={field.placeholder}
                onChange={(event) => {
                  const placeholder = event.currentTarget.value;
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid ? { ...item, placeholder } : item,
                    ),
                  );
                }}
                placeholder="Напр. Мария"
                className={fieldClassName}
              />
            </label>

            <label className="text-sm font-medium text-boutique-ink">
              Максимален брой символи
              <input
                name={adminFormFields.personalizationField.maxLengths}
                type="number"
                min="1"
                max="1000"
                value={field.maxLength}
                disabled={field.type === "date"}
                onChange={(event) => {
                  const maxLength = Number(event.currentTarget.value) || 1;
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid
                        ? { ...item, maxLength }
                        : item,
                    ),
                  );
                }}
                className={fieldClassName}
              />
              {field.type === "date" ? (
                <input
                  type="hidden"
                  name={adminFormFields.personalizationField.maxLengths}
                  value="10"
                />
              ) : null}
            </label>

            <label className="text-sm font-medium text-boutique-ink">
              Доплащане при попълване (€)
              <input
                name={adminFormFields.personalizationField.priceDeltas}
                type="number"
                min="0"
                step="0.01"
                value={field.priceDeltaInput}
                onChange={(event) => {
                  const priceDeltaInput = event.currentTarget.value;
                  const parsed = Number(priceDeltaInput);
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid
                        ? {
                            ...item,
                            priceDeltaInput,
                            ...(priceDeltaInput.trim() && Number.isFinite(parsed)
                              ? { priceDelta: Math.max(0, parsed) }
                              : {}),
                          }
                        : item,
                    ),
                  );
                }}
                onBlur={() => {
                  if (field.priceDeltaInput.trim()) {
                    return;
                  }
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid
                        ? {
                            ...item,
                            priceDelta: 0,
                            priceDeltaInput: "0",
                          }
                        : item,
                    ),
                  );
                }}
                className={fieldClassName}
              />
              <span className={`mt-1 block ${helperClassName}`}>
                Въведете 0, ако няма доплащане. Цената се начислява само когато
                клиентът попълни полето.
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-boutique-ink">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(event) => {
                  const required = event.currentTarget.checked;
                  setFields((current) =>
                    current.map((item) =>
                      item.uid === field.uid ? { ...item, required } : item,
                    ),
                  );
                }}
              />
              Задължително поле
            </label>

            {field.type === "textarea" ? (
              <label className="inline-flex items-center gap-2 text-sm text-boutique-ink">
                <input
                  type="checkbox"
                  checked={field.allowsWishTemplates}
                  onChange={(event) => {
                    const allowsWishTemplates = event.currentTarget.checked;
                    setFields((current) =>
                      current.map((item) =>
                        item.uid === field.uid
                          ? { ...item, allowsWishTemplates }
                          : item,
                      ),
                    );
                  }}
                />
                Показвай готови пожелания
              </label>
            ) : null}
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={() => setFields((current) => [...current, makeField()])}
        className="rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-boutique-ink transition hover:border-boutique-accent/50"
      >
        + Добави поле за персонализация
      </button>
    </div>
  );
}
