"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFieldClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import {
  filterCategoriesByType,
  getAdminCategoryFilterLabel,
} from "@/lib/admin/category-groups";
import type { CategoryType } from "@/lib/admin/types";
import { formatEur } from "@/lib/format-eur";
import {
  filterPromotionProducts,
  type PromotionProductOption,
} from "@/lib/promotion-admin";

type RelatedProductCategoryOption = {
  id: string;
  name: string;
  categoryType: CategoryType;
};

type RelatedProductPickerBaseProps = {
  products: PromotionProductOption[];
  categories: RelatedProductCategoryOption[];
  excludeProductId: string;
  hiddenFieldName?: string;
  pageSize?: number;
  disabled?: boolean;
};

type RelatedProductPickerMultipleProps = RelatedProductPickerBaseProps & {
  mode?: "multiple";
  selectedRelatedIds: string[];
  selectedProductId?: never;
};

type RelatedProductPickerSingleProps = RelatedProductPickerBaseProps & {
  mode: "single";
  selectedProductId: string | null;
  selectedRelatedIds?: never;
};

type RelatedProductPickerProps =
  | RelatedProductPickerMultipleProps
  | RelatedProductPickerSingleProps;

export function RelatedProductPicker(props: RelatedProductPickerProps) {
  const {
    products,
    categories,
    excludeProductId,
    pageSize = 40,
    disabled = false,
  } = props;
  const mode = props.mode ?? "multiple";
  const selectedRelatedIds =
    mode === "multiple" ? props.selectedRelatedIds : undefined;
  const selectedProductIdProp =
    mode === "single" ? props.selectedProductId : null;
  const hiddenFieldName =
    props.hiddenFieldName ??
    (mode === "single"
      ? adminFormFields.merchandising.readyProductCtaProductId
      : adminFormFields.merchandising.relatedProductIds);

  const initialSelectedIds =
    mode === "single"
      ? selectedProductIdProp
        ? [selectedProductIdProp]
        : []
      : selectedRelatedIds ?? [];

  const [selectedIds, setSelectedIds] = useState(
    () => new Set(initialSelectedIds),
  );
  const [query, setQuery] = useState("");
  const [productCategoryId, setProductCategoryId] = useState("all");
  const [materialCategoryId, setMaterialCategoryId] = useState("all");
  const [occasionCategoryId, setOccasionCategoryId] = useState("all");
  const [onlySelected, setOnlySelected] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(pageSize);

  useEffect(() => {
    if (mode === "single") {
      setSelectedIds(
        selectedProductIdProp ? new Set([selectedProductIdProp]) : new Set(),
      );
      return;
    }

    setSelectedIds(new Set(selectedRelatedIds ?? []));
  }, [mode, selectedProductIdProp, selectedRelatedIds]);

  const productCategories = filterCategoriesByType(categories, "product");
  const materialCategories = filterCategoriesByType(categories, "material");
  const occasionCategories = filterCategoriesByType(categories, "occasion");

  const candidateProducts = useMemo(
    () => products.filter((product) => product.id !== excludeProductId),
    [excludeProductId, products],
  );

  const filteredProducts = useMemo(
    () =>
      filterPromotionProducts(candidateProducts, {
        query,
        productCategoryId,
        materialCategoryId,
        occasionCategoryId,
        status: "all",
        onlySelected: mode === "single" ? false : onlySelected,
        selectedIds,
      }),
    [
      candidateProducts,
      materialCategoryId,
      mode,
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
    materialCategoryId !== "all"
      ? materialCategories.find((category) => category.id === materialCategoryId)
          ?.name
      : null,
    occasionCategoryId !== "all"
      ? occasionCategories.find((category) => category.id === occasionCategoryId)
          ?.name
      : null,
    query.trim() ? `търсене: ${query.trim()}` : null,
    mode === "multiple" && onlySelected ? "само избрани" : null,
  ].filter(Boolean);
  const activeFilterLabel = activeFilterParts.length
    ? activeFilterParts.join(" · ")
    : "всички продукти";

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [materialCategoryId, occasionCategoryId, onlySelected, pageSize, productCategoryId, query]);

  function toggleProduct(productId: string) {
    if (disabled) {
      return;
    }

    setSelectedIds((current) => {
      if (mode === "single") {
        return current.has(productId) ? new Set() : new Set([productId]);
      }

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

  const selectedProductId =
    mode === "single" ? [...selectedIds][0] ?? "" : "";

  return (
    <div className={disabled ? "pointer-events-none opacity-50" : undefined}>
      {mode === "single" ? (
        <input
          type="hidden"
          name={hiddenFieldName}
          value={selectedProductId}
        />
      ) : (
        [...selectedIds].map((productId) => (
          <input
            key={productId}
            type="hidden"
            name={hiddenFieldName}
            value={productId}
          />
        ))
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted sm:col-span-2">
          Търсене по име или slug
          <input
            type="search"
            value={query}
            disabled={disabled}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Име или slug..."
            className={`${adminFieldClass} !mt-1.5`}
          />
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          {getAdminCategoryFilterLabel("product")}
          <select
            value={productCategoryId}
            disabled={disabled}
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
          {getAdminCategoryFilterLabel("material")}
          <select
            value={materialCategoryId}
            disabled={disabled}
            onChange={(event) => setMaterialCategoryId(event.target.value)}
            className={`${adminFieldClass} !mt-1.5`}
          >
            <option value="all">Всички</option>
            {materialCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          {getAdminCategoryFilterLabel("occasion")}
          <select
            value={occasionCategoryId}
            disabled={disabled}
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
        {mode === "multiple" ? (
          <label className="flex items-center gap-2 text-sm font-medium text-boutique-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={onlySelected}
              disabled={disabled}
              onChange={(event) => setOnlySelected(event.target.checked)}
              className="h-4 w-4 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
            />
            Само избрани
          </label>
        ) : null}
      </div>

      {mode === "multiple" ? (
        <>
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
              disabled={disabled || filteredProducts.length === 0}
              className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold hover:border-boutique-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 disabled:opacity-40"
            >
              Избор на всички филтрирани
            </button>
            <button
              type="button"
              onClick={removeAllFiltered}
              disabled={disabled || selectedInFilterCount === 0}
              className="rounded-full border border-boutique-line px-3 py-1.5 text-xs font-semibold hover:border-boutique-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 disabled:opacity-40"
            >
              Премахване на всички филтрирани
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-boutique-muted">
          Текущ филтър: {activeFilterLabel}. Изберете един готов продукт за CTA
          бутона. Ако не изберете, се използва първият свързан продукт.
        </p>
      )}

      <p className="mt-2 text-xs text-boutique-muted">
        Показани {visibleProducts.length}
        {mode === "multiple"
          ? ` · Избрани ${selectedIds.size} · От филтъра избрани ${selectedInFilterCount} от ${filteredProducts.length}`
          : selectedProductId
            ? " · Избран 1 продукт"
            : " · Няма избран продукт"}
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
                  type={mode === "single" ? "radio" : "checkbox"}
                  name={
                    mode === "single"
                      ? `${hiddenFieldName}-picker`
                      : undefined
                  }
                  checked={isSelected}
                  disabled={disabled}
                  onChange={() => toggleProduct(product.id)}
                  className="h-4 w-4 shrink-0 border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
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
                <span className="shrink-0 text-xs font-semibold text-boutique-ink">
                  {formatEur(product.price)}
                </span>
              </label>
            );
          })
        )}
      </div>

      {visibleProducts.length < filteredProducts.length ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setVisibleLimit((current) => current + pageSize)}
          className="mt-2 rounded-full border border-boutique-sage-deep/30 px-4 py-1.5 text-xs font-semibold text-boutique-sage-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30 disabled:opacity-40"
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
