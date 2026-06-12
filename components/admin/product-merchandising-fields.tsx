"use client";

import { useMemo, useState } from "react";

import { adminFormFields } from "@/lib/admin/form-fields";

type ProductOption = {
  id: string;
  name: string;
};

type ProductMerchandisingFieldsProps = {
  products: ProductOption[];
  selectedRelatedIds: string[];
  isFeatured: boolean;
  homeSortOrder: number;
};

export function ProductMerchandisingFields({
  products,
  selectedRelatedIds,
  isFeatured,
  homeSortOrder,
}: ProductMerchandisingFieldsProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("bg");
  const selectedIds = useMemo(
    () => new Set(selectedRelatedIds),
    [selectedRelatedIds],
  );
  const visibleProducts = products.filter(
    (product) =>
      selectedIds.has(product.id) ||
      !normalizedQuery ||
      product.name.toLocaleLowerCase("bg").includes(normalizedQuery),
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
      <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
        <label className="flex items-start gap-3 text-sm font-medium text-boutique-ink">
          <input
            name={adminFormFields.merchandising.isFeatured}
            type="checkbox"
            defaultChecked={isFeatured}
            className="mt-0.5 h-4 w-4 rounded border-boutique-line text-boutique-accent"
          />
          <span>
            Покажи на началната страница
            <span className="mt-1 block text-xs font-normal leading-relaxed text-boutique-muted">
              Продуктът ще се появи в секцията „Избрани подаръци“.
            </span>
          </span>
        </label>

        <label className="mt-4 block text-sm font-medium text-boutique-ink">
          Позиция
          <input
            name={adminFormFields.merchandising.homeSortOrder}
            type="number"
            min="0"
            step="10"
            defaultValue={homeSortOrder}
            className="mt-2 w-28 rounded-lg border border-boutique-line bg-white px-3 py-2"
          />
          <span className="mt-1 block text-xs font-normal text-boutique-muted">
            По-малкото число се показва по-напред.
          </span>
        </label>
      </div>

      <div className="rounded-xl border border-boutique-line bg-boutique-bg p-4">
        <label className="text-sm font-medium text-boutique-ink">
          Свързани продукти
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Търси продукт по име..."
            className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5"
          />
        </label>
        <p className="mt-2 text-xs leading-relaxed text-boutique-muted">
          Изберете до 8 продукта. Те ще се покажат в зададения тук ред.
        </p>

        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-boutique-line bg-white p-2">
          {visibleProducts.length ? (
            visibleProducts.map((product) => (
              <label
                key={product.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-boutique-ink hover:bg-boutique-warm/45"
              >
                <input
                  name={adminFormFields.merchandising.relatedProductIds}
                  type="checkbox"
                  value={product.id}
                  defaultChecked={selectedIds.has(product.id)}
                  className="h-4 w-4 rounded border-boutique-line text-boutique-accent"
                />
                <span className="line-clamp-1">{product.name}</span>
              </label>
            ))
          ) : (
            <p className="px-2 py-3 text-sm text-boutique-muted">
              Няма намерени продукти.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
