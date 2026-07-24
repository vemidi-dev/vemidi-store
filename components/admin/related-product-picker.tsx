"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFieldClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { CategoryType } from "@/lib/admin/types";
import {
  filterPromotionProducts,
  type PromotionProductOption,
} from "@/lib/promotion-admin";

type RelatedProductCategoryOption = {
  id: string;
  name: string;
  categoryType: CategoryType;
};

type RelatedProductPickerProps = {
  products: PromotionProductOption[];
  categories: RelatedProductCategoryOption[];
  excludeProductId: string;
  selectedRelatedIds: string[];
  hiddenFieldName?: string;
  pageSize?: number;
};

export function RelatedProductPicker({
  products,
  categories,
  excludeProductId,
  selectedRelatedIds,
  hiddenFieldName = adminFormFields.merchandising.relatedProductIds,
  pageSize = 40,
}: RelatedProductPickerProps) {
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(selectedRelatedIds),
  );
  const [query, setQuery] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("all");
  const [occasionCategoryId, setOccasionCategoryId] = useState("all");
  const [onlySelected, setOnlySelected] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(pageSize);

  useEffect(() => {
    setSelectedIds(new Set(selectedRelatedIds));
  }, [selectedRelatedIds]);

  const productCategories = categories.filter(
    (category) => category.categoryType === "product",
  );
  const occasionCategories = categories.filter(
    (category) => category.categoryType === "occasion",
  );

  const candidateProducts = useMemo(
    () => products.filter((product) => product.id !== excludeProductId),
    [excludeProductId, products],
  );

  const filteredProducts = useMemo(
    () =>
      filterPromotionProducts(candidateProducts, {
        query,
        productCategoryId,
        occasionCategoryId,
        status: "all",
        onlySelected,
        selectedIds,
      }),
    [
      candidateProducts,
      occasionCategoryId,
      onlySelected,
      productCategoryId,
      query,
      selectedIds,
    ],
  );

  const visibleProducts = filteredProducts.slice(0, visibleLimit);
  const selectedInFilterCount = filteredProducts.filter((product) =>
    selectedIds.has(product.id),
  ).length;
  const unselectedInFilterCount = filteredProducts.length - selectedInFilterCount;
  const activeFilterParts = [
    productCategoryId !== "all"
      ? productCategories.find((category) => category.id === productCategoryId)
          ?.name
      : null,
    occasionCategoryId !== "all"
      ? occasionCategories.find((category) => category.id === occasionCategoryId)
          ?.name
      : null,
    query.trim() ? `търсене: ${query.trim()}` : null,
    onlySelected ? "само избрани" : null,
  ].filter(Boolean);
  const activeFilterLabel = activeFilterParts.length
    ? activeFilterParts.join(" · ")
    : "всички продукти";

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [occasionCategoryId, onlySelected, pageSize, productCategoryId, query]);

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(
      (current) =>
        new Set([...current, ...filteredProducts.map((product) => product.id)]),
    );
  }

  function removeAllFiltered() {
    const filteredIdSet = new Set(filteredProducts.map((product) => product.id));
    setSelectedIds(
      (current) =>
        new Set([...current].filter((productId) => !filteredIdSet.has(productId))),
    );
  }

  return (
    <div>
      {[...selectedIds].map((productId) => (
        <input
          key={productId}
          type="hidden"
          name={hiddenFieldName}
          value={productId}
        />
      ))}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted sm:col-span-2">
          Търсене по име или slug
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Име или slug..."
            className={`${adminFieldClass} !mt-1.5`}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Категория
          <select
            value={productCategoryId}
            onChange={(event) => setProductCategoryId(event.target.value)}
            className={`${adminFieldClass} !mt-1.5`}
          >
            <option value="all">Всички</option>
            {productCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Повод
          <select
            value={occasionCategoryId}
            onChange={(event) => setOccasionCategoryId(event.target.value)}
            className={`${adminFieldClass} !mt-1.5`}
          >
            <option value="all">Всички</option>
            {occasionCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-boutique-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={onlySelected}
            onChange={(event) => setOnlySelected(event.target.checked)}
            className="h-4 w-4 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
          />
          Само избрани
        </label>
      </div>

      <div className="mt-3 rounded-lg border border-boutique-line bg-boutique-paper/70 px-3 py-2 text-xs leading-relaxed text-boutique-muted">
        <span className="font-semibold text-boutique-ink">Bulk избор:</span>{" "}
        текущ филтър: {activeFilterLabel}. Във филтъра са избрани{" "}
        {selectedInFilterCount} от {filteredProducts.length}
        {unselectedInFilterCount > 0
          ? `, могат да се добавят още ${unselectedInFilterCount}`
          : ""}.
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllFiltered}
          disabled={filteredProducts.length === 0}
          className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold hover:border-boutique-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 disabled:opacity-40"
        >
          Избор на всички филтрирани
        </button>
        <button
          type="button"
          onClick={removeAllFiltered}
          disabled={selectedInFilterCount === 0}
          className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold hover:border-boutique-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 disabled:opacity-40"
        >
          Премахване на всички филтрирани
        </button>
      </div>

      <p className="mt-2 text-xs text-boutique-muted">
        Показани {visibleProducts.length} · Избрани {selectedIds.size} · От
        филтъра избрани {selectedInFilterCount} от {filteredProducts.length}
      </p>

      <div className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-boutique-line bg-white p-2">
        {visibleProducts.length === 0 ? (
          <p className="px-2 py-3 text-sm text-boutique-muted">
            Няма продукти по критериите.
          </p>
        ) : (
          visibleProducts.map((product) => {
            const isSelected = selectedIds.has(product.id);
            return (
              <label
                key={product.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition focus-within:ring-2 focus-within:ring-boutique-accent/20 ${
                  isSelected
                    ? "border-boutique-sage/35 bg-boutique-sage/10"
                    : "border-transparent hover:border-boutique-line/70 hover:bg-boutique-warm/45"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4 shrink-0 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
                />
                <ProductPickerThumb imageUrl={product.imageUrl} name={product.name} />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      isSelected ? "font-semibold text-boutique-sage-deep" : "text-boutique-ink"
                    }`}
                  >
                    {product.name}
                  </span>
                  <span className="block truncate text-[10px] text-boutique-muted">
                    {product.slug}
                  </span>
                  {product.categorySummary ? (
                    <span className="block truncate text-[10px] text-boutique-muted/90">
                      {product.categorySummary}
                    </span>
                  ) : null}
                </span>
              </label>
            );
          })
        )}
      </div>

      {visibleProducts.length < filteredProducts.length ? (
        <button
          type="button"
          onClick={() => setVisibleLimit((current) => current + pageSize)}
          className="mt-2 rounded-full border border-boutique-sage-deep/30 px-4 py-1.5 text-xs font-semibold text-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
        >
          Покажи още {Math.min(pageSize, filteredProducts.length - visibleProducts.length)}
        </button>
      ) : null}
    </div>
  );
}

function ProductPickerThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-boutique-line bg-boutique-bg sm:h-10 sm:w-10">
      {imageUrl ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
          role="img"
          aria-label={name}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-[9px] text-boutique-muted">
          —
        </div>
      )}
    </div>
  );
}
