"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { adminFieldClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { buildRelatedCategorySelectorOptions } from "@/lib/admin/category-related";
import type { CategoryRow } from "@/lib/admin/types";

type CategoryRelatedSelectorProps = {
  categories: CategoryRow[];
  excludeCategoryId?: string | null;
  selectedRelatedIds?: string[];
  categoryType?: CategoryRow["category_type"];
  categoryTypeFieldName?: string;
};

export function CategoryRelatedSelector({
  categories,
  excludeCategoryId = null,
  selectedRelatedIds = [],
  categoryType,
  categoryTypeFieldName,
}: CategoryRelatedSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState(
    () => new Set(selectedRelatedIds),
  );
  const [query, setQuery] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [resolvedCategoryType, setResolvedCategoryType] = useState<
    CategoryRow["category_type"]
  >(categoryType ?? "product");

  useEffect(() => {
    setSelectedIds(new Set(selectedRelatedIds));
  }, [selectedRelatedIds]);

  useEffect(() => {
    if (categoryType) {
      setResolvedCategoryType(categoryType);
    }
  }, [categoryType]);

  useEffect(() => {
    if (categoryType || !categoryTypeFieldName) {
      return;
    }

    const form = containerRef.current?.closest("form");
    const select = form?.querySelector(
      `[name="${categoryTypeFieldName}"]`,
    ) as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    const updateCategoryType = () => {
      setResolvedCategoryType(
        select.value === "occasion" ? "occasion" : "product",
      );
    };

    updateCategoryType();
    select.addEventListener("change", updateCategoryType);
    return () => select.removeEventListener("change", updateCategoryType);
  }, [categoryType, categoryTypeFieldName]);

  const options = useMemo(
    () =>
      buildRelatedCategorySelectorOptions(categories, {
        excludeCategoryId,
      }),
    [categories, excludeCategoryId],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase("bg");
  const filteredOptions = useMemo(() => {
    return options.filter((option) => {
      if (onlySelected && !selectedIds.has(option.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = `${option.label} ${option.slug}`.toLocaleLowerCase("bg");
      return searchable.includes(normalizedQuery);
    });
  }, [normalizedQuery, onlySelected, options, selectedIds]);

  function toggleCategory(categoryId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  if (resolvedCategoryType !== "product") {
    return (
      <div
        ref={containerRef}
        className="rounded-xl border border-dashed border-boutique-line bg-boutique-bg/40 p-4"
      >
        <p className="text-sm font-medium text-boutique-ink">Свързани категории</p>
        <p className="mt-1 text-xs text-boutique-muted">
          Налично само за продуктови категории.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-xl border border-boutique-line bg-white p-4">
      <p className="text-sm font-medium text-boutique-ink">Свързани категории</p>
      <p className="mt-1 text-xs leading-relaxed text-boutique-muted">
        Показват се като допълнителни препратки в страницата на категорията. Не
        променят основната йерархия и breadcrumbs.
      </p>

      {[...selectedIds].map((categoryId) => (
        <input
          key={categoryId}
          type="hidden"
          name={adminFormFields.category.relatedCategoryIds}
          value={categoryId}
        />
      ))}

      <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-boutique-muted">
        Търсене по име или slug
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Име или slug..."
          className={`${adminFieldClass} !mt-1.5`}
        />
      </label>

      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-boutique-ink">
        <input
          type="checkbox"
          checked={onlySelected}
          onChange={(event) => setOnlySelected(event.target.checked)}
          className="h-4 w-4 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
        />
        Само избрани
      </label>

      <p className="mt-2 text-xs text-boutique-muted">
        Избрани {selectedIds.size} от {options.length} налични продуктови категории
      </p>

      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-boutique-line bg-boutique-bg/20 p-2">
        {filteredOptions.length === 0 ? (
          <p className="px-2 py-3 text-sm text-boutique-muted">
            Няма категории по критериите.
          </p>
        ) : (
          filteredOptions.map((option) => {
            const isSelected = selectedIds.has(option.id);
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 transition focus-within:ring-2 focus-within:ring-boutique-accent/20 ${
                  isSelected
                    ? "border-boutique-sage/35 bg-boutique-sage/10"
                    : "border-transparent hover:border-boutique-line/70 hover:bg-boutique-warm/45"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCategory(option.id)}
                  className="h-4 w-4 shrink-0 rounded border-boutique-line text-boutique-accent focus-visible:ring-2 focus-visible:ring-boutique-accent/30"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${
                      isSelected
                        ? "font-semibold text-boutique-sage-deep"
                        : "text-boutique-ink"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="block truncate text-[10px] text-boutique-muted">
                    {option.slug}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
