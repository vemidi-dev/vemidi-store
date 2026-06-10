"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/catalog";
import type { SelectedProductColor } from "@/lib/product-colors";
import type {
  ProductPersonalizationField,
  ProductPersonalizationValue,
} from "@/lib/product-personalization";

type ProductDetailAddToCartProps = { product: Product };

export function ProductDetailAddToCart({ product }: ProductDetailAddToCartProps) {
  const { addProduct } = useCart();
  const fallbackFields: ProductPersonalizationField[] =
    product.customizable && !(product.personalizationFields?.length)
      ? [{
          id: "legacy",
          label: "Текст за персонализация",
          key: "personalization",
          type: "textarea",
          placeholder: "Напишете име, дата или текст",
          maxLength: 1000,
          required: false,
          allowsWishTemplates: true,
        }]
      : [];
  const fields = product.personalizationFields?.length
    ? product.personalizationFields
    : fallbackFields;
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wishFieldId, setWishFieldId] = useState<string | null>(null);
  const colorFields = product.colorFields ?? [];

  const flattenSelectedColors = (): SelectedProductColor[] => {
    const out: SelectedProductColor[] = [];
    colorFields.forEach((field) => {
      (selectedByGroup[field.id] ?? []).forEach((optionId) => {
        const option = field.options.find((candidate) => candidate.id === optionId);
        if (option) {
          out.push({
            fieldId: field.id,
            fieldLabel: field.label,
            groupId: field.groupId,
            groupKey: field.key,
            groupLabel: field.groupLabel,
            optionId: option.id,
            optionName: option.name,
            optionHex: option.hex,
          });
        }
      });
    });
    return out;
  };

  const validate = () => {
    for (const field of fields) {
      if (field.required && !(values[field.id] ?? "").trim()) {
        return `Попълнете полето „${field.label}“.`;
      }
    }
    for (const field of colorFields) {
      const count = (selectedByGroup[field.id] ?? []).length;
      if (count < field.minSelect || count > field.maxSelect) {
        return `Изберете ${field.minSelect === field.maxSelect ? field.minSelect : `${field.minSelect}–${field.maxSelect}`} цвята за „${field.label}“.`;
      }
    }
    return null;
  };

  const personalization = fields
    .map((field) => {
      const value = (values[field.id] ?? "").trim();
      return value ? `${field.label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n")
    .slice(0, 1000);
  const personalizationFields: ProductPersonalizationValue[] = fields.flatMap(
    (field) => {
      const value = (values[field.id] ?? "").trim();
      return value
        ? [{
            fieldId: field.id,
            fieldKey: field.key,
            label: field.label,
            value,
          }]
        : [];
    },
  );

  if (product.soldOut) {
    return (
      <div className="mt-8 rounded-xl border border-boutique-line bg-boutique-bg px-5 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-boutique-muted">
          Изчерпан
        </p>
        <p className="mt-2 text-sm leading-relaxed text-boutique-muted">
          Този продукт временно не е наличен за поръчка. Можете да се свържете с нас за
          алтернатива или срок.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-2xl border border-boutique-line bg-boutique-paper p-5 sm:p-6">
      {fields.length ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((field) => {
            const value = values[field.id] ?? "";
            const common = {
              id: `personalization-${field.id}`,
              value,
              required: field.required,
              maxLength: field.maxLength,
              placeholder: field.placeholder ?? undefined,
              onChange: (
                event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) =>
                setValues((current) => ({
                  ...current,
                  [field.id]: event.target.value.slice(0, field.maxLength),
                })),
              className:
                "mt-2 w-full rounded-xl border border-boutique-line bg-white px-4 py-3 text-sm text-boutique-ink outline-none focus:border-boutique-rose-deep",
            };
            return (
              <label
                key={field.id}
                className={`text-sm font-medium text-boutique-ink ${
                  field.type === "textarea" ? "sm:col-span-2" : ""
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  {field.allowsWishTemplates && (product.wishTemplates?.length ?? 0) > 0 ? (
                    <button
                      type="button"
                      onClick={() => setWishFieldId(field.id)}
                      className="rounded-full border border-boutique-rose/40 px-3 py-1 text-xs font-semibold text-boutique-rose-deep"
                    >
                      ♡ Идеи за пожелание
                    </button>
                  ) : null}
                </span>
                {field.type === "textarea" ? (
                  <textarea {...common} rows={4} />
                ) : (
                  <input {...common} type={field.type} />
                )}
                {field.type === "textarea" ? (
                  <span className="mt-1 block text-right text-xs text-boutique-muted">
                    {value.length}/{field.maxLength} знака
                  </span>
                ) : null}
              </label>
            );
          })}
          <p className="sm:col-span-2 text-xs leading-5 text-boutique-muted">
            Прегледайте и редактирайте избраното пожелание спрямо получателя – име, пол,
            възраст и конкретен повод.
          </p>
        </div>
      ) : null}

      {colorFields.length ? (
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          {colorFields.map((field) => (
            <fieldset key={field.id}>
              <legend className="text-sm font-semibold text-boutique-ink">{field.label}</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {field.options.map((option) => {
                  const selected = (selectedByGroup[field.id] ?? []).includes(option.id);
                  return (
                    <label key={option.id} className="cursor-pointer text-center text-xs text-boutique-muted">
                      <input
                        className="sr-only"
                        type={field.maxSelect <= 1 ? "radio" : "checkbox"}
                        name={`color-${field.id}`}
                        checked={selected}
                        onChange={(event) => {
                          const current = selectedByGroup[field.id] ?? [];
                          const next = field.maxSelect <= 1
                            ? event.target.checked ? [option.id] : []
                            : event.target.checked
                              ? [...current, option.id].slice(0, field.maxSelect)
                              : current.filter((id) => id !== option.id);
                          setSelectedByGroup((state) => ({ ...state, [field.id]: next }));
                          setError(null);
                        }}
                      />
                      <span
                        className={`mx-auto block h-9 w-9 rounded-full border-2 ${
                          selected ? "border-boutique-sage-deep ring-2 ring-boutique-sage/30" : "border-white ring-1 ring-boutique-line"
                        }`}
                        style={{ backgroundColor: option.hex ?? "#eee8df" }}
                      />
                      <span className="mt-1 block">{option.name}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-5 text-sm font-medium text-red-700">{error}</p> : null}
      <button
        type="button"
        aria-live="polite"
        onClick={() => {
          const validationError = validate();
          if (validationError) return setError(validationError);
          addProduct(
            product,
            1,
            personalization || undefined,
            flattenSelectedColors() || undefined,
            personalizationFields,
          );
          setError(null);
          setAdded(true);
          setTimeout(() => setAdded(false), 2200);
        }}
        className={`mt-7 w-full rounded-xl px-8 py-4 text-sm font-semibold text-white transition ${
          added
            ? "bg-boutique-sage shadow-boutique-sm"
            : "bg-boutique-sage-deep hover:bg-boutique-ink"
        }`}
      >
        {added ? "✓ Добавено в количката" : "Добави в количката"}
      </button>

      {wishFieldId ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Избор на готово пожелание"
          className="fixed inset-0 z-50 grid place-items-center bg-boutique-ink/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setWishFieldId(null);
          }}
        >
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-heading text-3xl text-boutique-ink">
                  Избери готово пожелание
                </h2>
                <p className="mt-2 text-sm text-boutique-muted">
                  След избора можете свободно да редактирате текста.
                </p>
              </div>
              <button type="button" onClick={() => setWishFieldId(null)} className="text-2xl">×</button>
            </div>
            <div className="mt-6 grid gap-3">
              {(product.wishTemplates ?? []).map((wish) => (
                <article key={wish.id} className="rounded-xl border border-boutique-line bg-boutique-paper p-4">
                  <p className="whitespace-pre-line text-sm leading-6 text-boutique-muted">
                    {wish.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const field = fields.find((item) => item.id === wishFieldId);
                      setValues((current) => ({
                        ...current,
                        [wishFieldId]: wish.body.slice(0, field?.maxLength ?? 1000),
                      }));
                      setWishFieldId(null);
                    }}
                    className="mt-3 rounded-lg bg-boutique-sage-deep px-4 py-2 text-xs font-semibold text-white"
                  >
                    Избери текста
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
