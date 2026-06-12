"use client";

import { useEffect, useState } from "react";

type FilterOption = {
  value: string;
  label: string;
};

type AdminListFilterProps = {
  containerId: string;
  itemSelector: string;
  total: number;
  placeholder: string;
  filterLabel?: string;
  filterOptions?: FilterOption[];
  pageSize?: number;
};

export function AdminListFilter({
  containerId,
  itemSelector,
  total,
  placeholder,
  filterLabel = "Статус",
  filterOptions = [],
  pageSize = 25,
}: AdminListFilterProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(pageSize);
  const [matchCount, setMatchCount] = useState(total);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const normalizedQuery = query.trim().toLocaleLowerCase("bg");
    const items = Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector),
    );
    const matches = items.filter((item) => {
      const searchable = item.dataset.search ?? "";
      const itemFilter = item.dataset.filter ?? "";
      const matchesQuery =
        !normalizedQuery ||
        searchable.toLocaleLowerCase("bg").includes(normalizedQuery);
      const matchesFilter =
        filter === "all" || itemFilter.split(" ").includes(filter);
      return matchesQuery && matchesFilter;
    });
    const matchSet = new Set(matches.slice(0, visibleLimit));

    items.forEach((item) => {
      item.hidden = !matchSet.has(item);
    });
    setMatchCount(matches.length);
  }, [containerId, filter, itemSelector, query, visibleLimit]);

  useEffect(() => {
    setVisibleLimit(pageSize);
  }, [filter, pageSize, query]);

  const shownCount = Math.min(matchCount, visibleLimit);

  return (
    <div className="mt-5 rounded-xl border border-boutique-line bg-boutique-bg/70 p-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
        <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Търсене
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink outline-none focus:border-boutique-accent/50"
          />
        </label>
        {filterOptions.length ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            {filterLabel}
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="all">Всички</option>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setFilter("all");
          }}
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
