"use client";

import { useMemo, useState } from "react";

import { adminFieldClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { formatEur } from "@/lib/format-eur";
import {
  filterPromotionProducts,
  type PromotionProductOption,
} from "@/lib/promotion-admin";

type PromotionCategoryOption = {
  id: string;
  name: string;
  categoryType: "product" | "occasion";
};

type PromotionProductPickerProps = {
  products: PromotionProductOption[];
  categories: PromotionCategoryOption[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (next: Set<string>) => void;
  checkboxName?: string;
  pageSize?: number;
};

export function PromotionProductPicker({
  products,
  categories,
  selectedIds,
  onSelectedIdsChange,
  checkboxName = adminFormFields.promotion.productIds,
  pageSize = 30,
}: PromotionProductPickerProps) {
  const [query, setQuery] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("all");
  const [occasionCategoryId, setOccasionCategoryId] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "sold-out">("all");
  const [visibleLimit, setVisibleLimit] = useState(pageSize);

  const productCategories = categories.filter(
    (category) => category.categoryType === "product",
  );
  const occasionCategories = categories.filter(
    (category) => category.categoryType === "occasion",
  );

  const browseProducts = useMemo(
    () =>
      filterPromotionProducts(products, {
        query,
        productCategoryId,
        occasionCategoryId,
        status,
        excludeIds: selectedIds,
      }),
    [occasionCategoryId, productCategoryId, products, query, selectedIds, status],
  );

  const selectedProducts = useMemo(
    () =>
      filterPromotionProducts(products, {
        onlyIds: selectedIds,
      }).sort((left, right) => left.name.localeCompare(right.name, "bg")),
    [products, selectedIds],
  );

  const visibleBrowseProducts = browseProducts.slice(0, visibleLimit);

  function toggleProduct(productId: string) {
    onSelectedIdsChange(
      new Set(
        selectedIds.has(productId)
          ? [...selectedIds].filter((id) => id !== productId)
          : [...selectedIds, productId],
      ),
    );
  }

  function addShownProducts() {
    onSelectedIdsChange(
      new Set([...selectedIds, ...visibleBrowseProducts.map((product) => product.id)]),
    );
  }

  function removeShownProducts() {
    const removeIds = new Set(visibleBrowseProducts.map((product) => product.id));
    onSelectedIdsChange(
      new Set([...selectedIds].filter((productId) => !removeIds.has(productId))),
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted sm:col-span-2">
            Търсене по име
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleLimit(pageSize);
              }}
              placeholder="Име на продукт..."
              className={`${adminFieldClass} !mt-1.5`}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Категория
            <select
              value={productCategoryId}
              onChange={(event) => {
                setProductCategoryId(event.target.value);
                setVisibleLimit(pageSize);
              }}
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
              onChange={(event) => {
                setOccasionCategoryId(event.target.value);
                setVisibleLimit(pageSize);
              }}
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
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted sm:col-span-2">
            Статус
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as "all" | "active" | "sold-out");
                setVisibleLimit(pageSize);
              }}
              className={`${adminFieldClass} !mt-1.5`}
            >
              <option value="all">Всички</option>
              <option value="active">Активни</option>
              <option value="sold-out">Изчерпани</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addShownProducts}
            disabled={visibleBrowseProducts.length === 0}
            className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Избери показаните
          </button>
          <button
            type="button"
            onClick={removeShownProducts}
            disabled={visibleBrowseProducts.length === 0}
            className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            Премахни показаните
          </button>
        </div>

        <p className="mt-2 text-xs text-boutique-muted">
          Резултати: {Math.min(visibleBrowseProducts.length, browseProducts.length)} от{" "}
          {browseProducts.length}
        </p>

        <div className="mt-2 max-h-80 space-y-1 overflow-y-auto rounded-xl border border-boutique-line bg-white p-2">
          {visibleBrowseProducts.length === 0 ? (
            <p className="px-2 py-3 text-sm text-boutique-muted">Няма продукти по критериите.</p>
          ) : (
            visibleBrowseProducts.map((product) => (
              <label
                key={product.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-boutique-warm/45"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4 rounded border-boutique-line"
                />
                <ProductPickerThumb imageUrl={product.imageUrl} name={product.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-boutique-ink">{product.name}</span>
                  <span className="text-[11px] text-boutique-muted">
                    {formatEur(product.price)}
                    {product.isSoldOut ? " · изчерпан" : ""}
                  </span>
                  {product.categorySummary ? (
                    <span className="block truncate text-[10px] text-boutique-muted/90">
                      {product.categorySummary}
                    </span>
                  ) : null}
                </span>
              </label>
            ))
          )}
        </div>

        {visibleBrowseProducts.length < browseProducts.length ? (
          <button
            type="button"
            onClick={() => setVisibleLimit((current) => current + pageSize)}
            className="mt-2 rounded-full border border-boutique-sage-deep/30 px-4 py-1.5 text-xs font-semibold text-boutique-sage-deep"
          >
            Покажи още {Math.min(pageSize, browseProducts.length - visibleBrowseProducts.length)}
          </button>
        ) : null}
      </div>

      <div className="rounded-xl border border-boutique-line bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-boutique-ink">
            Избрани продукти ({selectedIds.size})
          </p>
          <button
            type="button"
            onClick={() => onSelectedIdsChange(new Set())}
            disabled={selectedIds.size === 0}
            className="text-xs font-semibold text-boutique-muted hover:text-boutique-ink disabled:opacity-40"
          >
            Изчисти
          </button>
        </div>

        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {selectedProducts.length === 0 ? (
            <p className="text-sm text-boutique-muted">Все още няма избрани продукти.</p>
          ) : (
            selectedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 rounded-lg border border-boutique-line/70 px-2 py-1.5"
              >
                <input type="hidden" name={checkboxName} value={product.id} />
                <ProductPickerThumb imageUrl={product.imageUrl} name={product.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-boutique-ink">{product.name}</p>
                  <p className="text-[11px] text-boutique-muted">{formatEur(product.price)}</p>
                  {product.categorySummary ? (
                    <p className="truncate text-[10px] text-boutique-muted/90">
                      {product.categorySummary}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => toggleProduct(product.id)}
                  className="rounded-full px-2 py-1 text-[11px] font-semibold text-boutique-muted hover:bg-boutique-bg"
                >
                  Премахни
                </button>
              </div>
            ))
          )}
        </div>
      </div>
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
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-boutique-line bg-boutique-bg">
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
