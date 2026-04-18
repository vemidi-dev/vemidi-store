"use client";

import { useState } from "react";

import { useCart } from "@/components/cart/cart-provider";
import type { Product } from "@/lib/catalog";
import type { ProductColorField, SelectedProductColor } from "@/lib/product-colors";

const PERSONALIZATION_MAX = 50;

type ProductDetailAddToCartProps = {
  product: Product;
};

export function ProductDetailAddToCart({ product }: ProductDetailAddToCartProps) {
  const { addProduct } = useCart();
  const [personalization, setPersonalization] = useState("");
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>({});
  const [added, setAdded] = useState(false);
  const [colorError, setColorError] = useState<string | null>(null);

  const trimmed = personalization.trim();
  const personalizationForCart = trimmed ? trimmed.slice(0, PERSONALIZATION_MAX) : undefined;
  const colorFields = product.colorFields ?? [];

  const flattenSelectedColors = (): SelectedProductColor[] => {
    const out: SelectedProductColor[] = [];

    colorFields.forEach((field) => {
      const selectedOptionIds = selectedByGroup[field.id] ?? [];
      selectedOptionIds.forEach((optionId) => {
        const option = field.options.find((candidate) => candidate.id === optionId);
        if (!option) {
          return;
        }
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
      });
    });

    return out;
  };

  const validateColorSelection = (): string | null => {
    for (const field of colorFields) {
      const selectedCount = (selectedByGroup[field.id] ?? []).length;
      if (selectedCount < field.minSelect) {
        return `Изберете поне ${field.minSelect} цвята за "${field.label}".`;
      }
      if (selectedCount > field.maxSelect) {
        return `Максимум ${field.maxSelect} цвята за "${field.label}".`;
      }
    }
    return null;
  };

  const handleToggleColor = (field: ProductColorField, optionId: string, checked: boolean) => {
    setSelectedByGroup((prev) => {
      const current = prev[field.id] ?? [];
      if (field.maxSelect <= 1) {
        return {
          ...prev,
          [field.id]: checked ? [optionId] : [],
        };
      }

      if (checked) {
        if (current.includes(optionId)) {
          return prev;
        }
        if (current.length >= field.maxSelect) {
          return prev;
        }
        return {
          ...prev,
          [field.id]: [...current, optionId],
        };
      }

      return {
        ...prev,
        [field.id]: current.filter((id) => id !== optionId),
      };
    });
    setColorError(null);
  };

  return (
    <div className="space-y-10 border-t border-boutique-line pt-12">
      {product.customizable ? (
        <div className="space-y-3">
          <label
            htmlFor={`personalization-${product.slug}`}
            className="block text-xs font-semibold uppercase tracking-[0.2em] text-boutique-muted"
          >
            Текст за персонализация
          </label>
          <input
            id={`personalization-${product.slug}`}
            type="text"
            value={personalization}
            onChange={(e) => setPersonalization(e.target.value.slice(0, PERSONALIZATION_MAX))}
            placeholder="Напиши име, дата или текст"
            maxLength={PERSONALIZATION_MAX}
            className="w-full rounded-xl border border-boutique-line bg-boutique-bg px-5 py-4 text-base leading-relaxed text-boutique-ink outline-none transition placeholder:text-boutique-muted/60 focus:border-boutique-accent/40 focus:ring-2 focus:ring-boutique-accent/15"
          />
          <p className="text-xs text-boutique-muted">
            {personalization.length}/{PERSONALIZATION_MAX} знака
          </p>
        </div>
      ) : null}

      {colorFields.length > 0 ? (
        <div className="space-y-6">
          {colorFields.map((field) => {
            const selectedIds = selectedByGroup[field.id] ?? [];
            return (
              <fieldset
                key={field.id}
                className="rounded-xl border border-boutique-line/80 bg-boutique-bg p-4 sm:p-5"
              >
                <legend className="px-1 text-sm font-semibold text-boutique-ink">{field.label}</legend>
                <p className="mb-3 text-xs text-boutique-muted">
                  Избери{" "}
                  {field.minSelect === field.maxSelect
                    ? field.maxSelect
                    : `${field.minSelect} до ${field.maxSelect}`}{" "}
                  цвята
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {field.options.map((option) => {
                    const checked = selectedIds.includes(option.id);
                    const disabled =
                      !checked && field.maxSelect > 1 && selectedIds.length >= field.maxSelect;
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                          checked
                            ? "border-boutique-accent/40 bg-boutique-paper text-boutique-ink"
                            : "border-boutique-line bg-white text-boutique-muted"
                        } ${disabled ? "opacity-50" : ""}`}
                      >
                        <input
                          type={field.maxSelect <= 1 ? "radio" : "checkbox"}
                          name={`color-field-${field.id}`}
                          checked={checked}
                          disabled={disabled}
                          onChange={(event) => handleToggleColor(field, option.id, event.currentTarget.checked)}
                          className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                        />
                        <span>{option.name}</span>
                        {option.hex ? (
                          <span
                            aria-hidden
                            className="ml-auto h-4 w-4 rounded-full border border-boutique-line"
                            style={{ backgroundColor: option.hex }}
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
          {colorError ? (
            <p className="text-sm font-medium text-red-700">{colorError}</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          const validationError = validateColorSelection();
          if (validationError) {
            setColorError(validationError);
            return;
          }

          const selectedColors = flattenSelectedColors();
          addProduct(
            product,
            1,
            product.customizable ? personalizationForCart : undefined,
            selectedColors.length > 0 ? selectedColors : undefined,
          );
          setColorError(null);
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
        className="rounded-full bg-boutique-ink px-12 py-4 text-sm font-semibold tracking-wide text-boutique-paper shadow-sm transition hover:bg-boutique-accent"
      >
        {added ? "Добавено в количката" : "Добави в количката"}
      </button>
    </div>
  );
}
