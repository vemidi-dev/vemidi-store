"use client";

import { useEffect, useState } from "react";

type FilterOption = {
  value: string;
  label: string;
};

type FilterConfig = {
  key: string;
  label: string;
  options: FilterOption[];
  dataAttribute?: string;
};

type SortOption = {
  value: string;
  label: string;
  attribute: string;
  direction?: "asc" | "desc";
};

type AdminListControlsProps = {
  containerId: string;
  itemSelector: string;
  total: number;
  searchPlaceholder: string;
  filters?: FilterConfig[];
  sortOptions?: SortOption[];
  defaultSort?: string;
  pageSize?: number;
  sticky?: boolean;
};

function getItemSortValue(item: HTMLElement, attribute: string): string | number {
  const value = item.dataset[attribute];
  if (value == null) {
    return "";
  }
  if (attribute === "sortPrice" || attribute === "sortIndex") {
    return Number(value);
  }
  return value.toLocaleLowerCase("bg");
}

function compareItems(
  a: HTMLElement,
  b: HTMLElement,
  sortKey: string,
  sortOptions: SortOption[],
): number {
  const option = sortOptions.find((entry) => entry.value === sortKey);
  if (!option) {
    return 0;
  }

  const left = getItemSortValue(a, option.attribute);
  const right = getItemSortValue(b, option.attribute);

  const direction = option.direction ?? "asc";
  let result = 0;

  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), "bg");
  }

  return direction === "desc" ? -result : result;
}

function itemMatchesFilter(
  item: HTMLElement,
  filterKey: string,
  filterValue: string,
  dataAttribute?: string,
): boolean {
  if (filterValue === "all") {
    return true;
  }

  const attribute = dataAttribute ?? `filter${filterKey.charAt(0).toUpperCase()}${filterKey.slice(1)}`;
  const datasetKey = attribute.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  const rawValue = item.dataset[datasetKey] ?? item.dataset.filter ?? "";
  const tokens = rawValue.split(/\s+/).filter(Boolean);
  return tokens.includes(filterValue);
}

export function AdminListControls({
  containerId,
  itemSelector,
  total,
  searchPlaceholder,
  filters = [],
  sortOptions = [],
  defaultSort = "",
  pageSize = 25,
  sticky = false,
}: AdminListControlsProps) {
  const [query, setQuery] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((filter) => [filter.key, "all"])),
  );
  const [sort, setSort] = useState(defaultSort || sortOptions[0]?.value || "");
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [matchCount, setMatchCount] = useState(total);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const normalizedQuery = query.trim().toLocaleLowerCase("bg");
    const items = Array.from(container.querySelectorAll<HTMLElement>(itemSelector));

    const matches = items.filter((item) => {
      const searchable = item.dataset.search ?? "";
      const matchesQuery =
        !normalizedQuery ||
        searchable.toLocaleLowerCase("bg").includes(normalizedQuery);

      const matchesFilters = filters.every((filter) =>
        itemMatchesFilter(item, filter.key, filterValues[filter.key] ?? "all", filter.dataAttribute),
      );

      return matchesQuery && matchesFilters;
    });

    if (sort && sortOptions.length > 0) {
      const sorted = [...matches].sort((left, right) => compareItems(left, right, sort, sortOptions));
      const parent = items[0]?.parentElement;
      if (parent) {
        sorted.forEach((item) => parent.appendChild(item));
      }
    }

    const matchSet = new Set(matches.slice(0, visibleLimit));
    items.forEach((item) => {
      item.hidden = !matchSet.has(item);
    });
    setMatchCount(matches.length);
  }, [containerId, filterValues, filters, itemSelector, query, sort, sortOptions, visibleLimit]);

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [filterValues, pageSize, query, sort]);

  const shownCount = Math.min(matchCount, visibleLimit);

  const resetFilters = () => {
    setQuery("");
    setFilterValues(Object.fromEntries(filters.map((filter) => [filter.key, "all"])));
    setSort(defaultSort || sortOptions[0]?.value || "");
  };

  return (
    <div
      className={`mt-5 rounded-xl border border-boutique-line bg-boutique-paper/95 p-3 shadow-boutique-sm backdrop-blur-sm ${
        sticky ? "sticky top-3 z-20" : "bg-boutique-bg/70"
      }`}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Търсене
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink outline-none focus:border-boutique-accent/50"
          />
        </label>

        {filters.map((filter) => (
          <label
            key={filter.key}
            className="text-xs font-semibold uppercase tracking-wider text-boutique-muted"
          >
            {filter.label}
            <select
              value={filterValues[filter.key] ?? "all"}
              onChange={(event) =>
                setFilterValues((current) => ({
                  ...current,
                  [filter.key]: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="all">Всички</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}

        {sortOptions.length > 0 ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Сортиране
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={resetFilters}
          className="self-end rounded-full border border-boutique-line bg-white px-4 py-2.5 text-xs font-semibold text-boutique-ink hover:border-boutique-accent/40"
        >
          Изчисти
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-boutique-line/70 pt-3">
        <p className="text-xs text-boutique-muted">
          Показани {shownCount} от {matchCount} намерени
          {matchCount !== total ? ` · общо ${total}` : ""}
        </p>
        {shownCount < matchCount ? (
          <button
            type="button"
            onClick={() => setVisibleLimit((current) => current + pageSize)}
            className="rounded-full border border-boutique-sage-deep/30 px-4 py-2 text-xs font-semibold text-boutique-sage-deep"
          >
            Покажи още {Math.min(pageSize, matchCount - shownCount)}
          </button>
        ) : null}
      </div>
    </div>
  );
}
