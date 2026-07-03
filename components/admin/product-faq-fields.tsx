"use client";

import { useMemo } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";
import type { FaqGroupRow, FaqItemRow } from "@/lib/faq/types";

type ProductFaqFieldsProps = {
  productGroups: FaqGroupRow[];
  items: FaqItemRow[];
  selectedGroupIds?: string[];
  selectedItemIds?: string[];
  helperClassName: string;
};

export function ProductFaqFields({
  productGroups,
  items,
  selectedGroupIds = [],
  selectedItemIds = [],
  helperClassName,
}: ProductFaqFieldsProps) {
  const activeProductGroups = useMemo(
    () =>
      [...productGroups]
        .filter((group) => group.scope === "product" && group.is_active)
        .sort(
          (left, right) =>
            left.sort_order - right.sort_order ||
            (left.name ?? "").localeCompare(right.name ?? "", "bg"),
        ),
    [productGroups],
  );

  const selectableItems = useMemo(() => {
    const selectedInactive = new Set(
      selectedItemIds.filter((id) => {
        const item = items.find((candidate) => candidate.id === id);
        return item && !item.is_active;
      }),
    );

    return [...items]
      .filter((item) => item.is_active || selectedInactive.has(item.id))
      .sort(
        (left, right) =>
          left.sort_order - right.sort_order ||
          (left.question ?? "").localeCompare(right.question ?? "", "bg"),
      );
  }, [items, selectedItemIds]);

  if (activeProductGroups.length === 0 && selectableItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-boutique-line p-4">
        <p className={helperClassName}>
          Няма активни продуктови FAQ групи или въпроси. Създайте ги в таб „Въпроси и
          отговори“.
        </p>
        <a
          href="/admin?tab=faq"
          className="mt-3 inline-flex rounded-full border border-boutique-line px-4 py-2 text-xs font-semibold text-boutique-ink"
        >
          Към FAQ управлението
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeProductGroups.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold text-boutique-ink">Продуктови FAQ групи</legend>
          <p className={helperClassName}>
            Групата добавя всички въпроси в нея. Ако изберете индивидуални въпроси по-долу, те ще бъдат точният списък за продукта.
          </p>
          <div className="mt-2 grid gap-2">
            {activeProductGroups.map((group) => (
              <label
                key={group.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-boutique-line bg-white p-3 text-sm text-boutique-ink"
              >
                <input
                  type="checkbox"
                  name={adminFormFields.product.faqGroupIds}
                  value={group.id}
                  defaultChecked={selectedGroupIds.includes(group.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-boutique-line text-boutique-accent"
                />
                <span>
                  <span className="font-medium">{group.name}</span>
                  <span className="mt-0.5 block text-xs text-boutique-muted">{group.slug}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {selectableItems.length > 0 ? (
        <fieldset>
          <legend className="text-xs font-semibold text-boutique-ink">
            Индивидуални FAQ въпроси
          </legend>
          <p className={helperClassName}>
            Изберете само въпросите, които са подходящи за този продукт. Ако има избрани въпроси тук, storefront ще покаже само тях.
          </p>
          <div className="mt-2 grid gap-2">
            {selectableItems.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-boutique-line bg-white p-3 text-sm text-boutique-ink"
              >
                <input
                  type="checkbox"
                  name={adminFormFields.product.faqItemIds}
                  value={item.id}
                  defaultChecked={selectedItemIds.includes(item.id)}
                  className="mt-1 h-4 w-4 shrink-0 rounded border-boutique-line text-boutique-accent"
                />
                <span>
                  <span className="font-medium">{item.question}</span>
                  <span className="mt-1 line-clamp-2 block text-xs text-boutique-muted">
                    {item.answer}
                  </span>
                  {!item.is_active ? (
                    <span className="mt-1 inline-block text-[10px] font-medium text-amber-700">
                      Скрит, но запазен за този продукт
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
