"use client";

import { useMemo, useState } from "react";

import { deleteWishTemplate } from "@/app/admin/wish-actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import {
  adminTableHeadClass,
  adminTableRowClass,
} from "@/components/admin/styles";
import {
  filterWishTemplates,
  getWishOccasionIds,
  sortWishTemplates,
  truncateWishBody,
  type WishActiveFilter,
  type WishOccasionFilter,
  type WishSortKey,
} from "@/lib/wish-admin";
import type {
  CategoryRow,
  WishTemplateOccasionRow,
  WishTemplateRow,
} from "@/lib/admin/types";

function IconTrash({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

const PAGE_SIZE = 50;

type WishListViewProps = {
  occasions: CategoryRow[];
  wishes: WishTemplateRow[];
  links: WishTemplateOccasionRow[];
  createFormDirty: boolean;
  onFilterAttempt: () => boolean;
};

export function WishListView({
  occasions,
  wishes,
  links,
  createFormDirty,
  onFilterAttempt,
}: WishListViewProps) {
  const [query, setQuery] = useState("");
  const [occasionFilter, setOccasionFilter] = useState<WishOccasionFilter>("all");
  const [activeFilter, setActiveFilter] = useState<WishActiveFilter>("all");
  const [sortKey, setSortKey] = useState<WishSortKey>("order-asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const occasionById = useMemo(
    () => new Map(occasions.map((item) => [item.id, item.name])),
    [occasions],
  );

  const visibleWishes = useMemo(() => {
    const filtered = filterWishTemplates(wishes, links, {
      search: query,
      occasion: occasionFilter,
      active: activeFilter,
    });
    return sortWishTemplates(filtered, sortKey);
  }, [activeFilter, links, occasionFilter, query, sortKey, wishes]);

  const shownWishes = visibleWishes.slice(0, visibleCount);

  function applyFilterChange<T>(setter: (value: T) => void, value: T) {
    if (!onFilterAttempt()) {
      return;
    }
    setter(value);
    setVisibleCount(PAGE_SIZE);
  }

  if (wishes.length === 0) {
    return (
      <p className="mt-4 text-sm text-boutique-muted">Все още няма добавени пожелания.</p>
    );
  }

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-boutique-line bg-boutique-bg/70 p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Търсене
            <input
              type="search"
              value={query}
              onChange={(event) => applyFilterChange(setQuery, event.target.value)}
              placeholder="Текст или заглавие..."
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink outline-none focus:border-boutique-accent/50"
            />
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            По повод
            <select
              value={occasionFilter}
              onChange={(event) =>
                applyFilterChange(setOccasionFilter, event.target.value as WishOccasionFilter)
              }
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="all">Всички</option>
              {occasions.map((occasion) => (
                <option key={occasion.id} value={occasion.id}>
                  {occasion.name}
                </option>
              ))}
              <option value="unassigned">Без повод</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Статус
            <select
              value={activeFilter}
              onChange={(event) =>
                applyFilterChange(setActiveFilter, event.target.value as WishActiveFilter)
              }
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="all">Всички</option>
              <option value="active">Активни</option>
              <option value="inactive">Неактивни</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Сортиране
            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as WishSortKey)}
              className="mt-1.5 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-boutique-ink"
            >
              <option value="order-asc">Ред (по подразбиране)</option>
              <option value="order-desc">Ред (обратен)</option>
              <option value="body-asc">Текст А–Я</option>
              <option value="body-desc">Текст Я–А</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              if (!onFilterAttempt()) {
                return;
              }
              setQuery("");
              setOccasionFilter("all");
              setActiveFilter("all");
              setSortKey("order-asc");
              setVisibleCount(PAGE_SIZE);
            }}
            className="self-end rounded-full border border-boutique-line bg-white px-4 py-2.5 text-xs font-semibold text-boutique-ink hover:border-boutique-accent/40"
          >
            Изчисти
          </button>
        </div>

        <p className="mt-3 border-t border-boutique-line/70 pt-3 text-xs text-boutique-muted">
          Показани {shownWishes.length} от {visibleWishes.length} намерени
          {visibleWishes.length !== wishes.length ? ` · общо ${wishes.length}` : ""}
          {createFormDirty ? " · има незаписани промени във формата за добавяне" : ""}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-boutique-line lg:hidden">
        <div className="divide-y divide-boutique-line/70">
          {shownWishes.map((wish) => {
            const occasionIds = getWishOccasionIds(wish.id, links);
            const wishOccasions = occasionIds
              .map((id) => occasionById.get(id))
              .filter(Boolean);

            return (
              <article key={wish.id} className="space-y-2 p-3">
                <p className="line-clamp-3 text-xs leading-snug text-boutique-ink" title={wish.body}>
                  {truncateWishBody(wish.body, 160)}
                </p>
                <div className="flex flex-wrap gap-1">
                  {wishOccasions.map((name) => (
                    <span
                      key={name}
                      className="rounded-full bg-boutique-sage-deep/10 px-1.5 py-px text-[9px] font-medium text-boutique-sage-deep"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-boutique-muted">
                    {wish.is_active ? "Активно" : "Неактивно"}
                  </span>
                  <AdminConfirmForm
                    action={deleteWishTemplate}
                    confirmMessage="Сигурни ли сте, че искате да изтриете това пожелание?"
                    className="inline"
                  >
                    <input type="hidden" name="id" value={wish.id} />
                    <button
                      type="submit"
                      aria-label="Изтрий пожелание"
                      className="rounded-md p-1 text-red-600 hover:bg-red-50"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </AdminConfirmForm>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-xl border border-boutique-line lg:block">
        <table className="min-w-[48rem] w-full text-left text-sm">
          <thead>
            <tr className={adminTableHeadClass}>
              <th className="px-3 py-2.5 font-semibold">Текст</th>
              <th className="px-3 py-2.5 font-semibold">Поводи</th>
              <th className="px-3 py-2.5 font-semibold">Статус</th>
              <th className="px-3 py-2.5 text-right font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {shownWishes.map((wish) => {
              const occasionIds = getWishOccasionIds(wish.id, links);
              const wishOccasions = occasionIds
                .map((id) => occasionById.get(id))
                .filter(Boolean);

              return (
                <tr key={wish.id} className={adminTableRowClass}>
                  <td className="max-w-md px-3 py-2.5 align-top">
                    <p className="line-clamp-2 text-xs leading-snug text-boutique-ink" title={wish.body}>
                      {truncateWishBody(wish.body)}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      {wishOccasions.length > 0 ? (
                        wishOccasions.map((name) => (
                          <span
                            key={name}
                            className="rounded-full bg-boutique-sage-deep/10 px-1.5 py-px text-[9px] font-medium text-boutique-sage-deep"
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-boutique-muted">Без повод</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 align-top text-xs text-boutique-muted">
                    {wish.is_active ? "Активно" : "Неактивно"}
                  </td>
                  <td className="px-3 py-2.5 align-top text-right">
                    <AdminConfirmForm
                      action={deleteWishTemplate}
                      confirmMessage="Сигурни ли сте, че искате да изтриете това пожелание?"
                      className="inline"
                    >
                      <input type="hidden" name="id" value={wish.id} />
                      <button
                        type="submit"
                        aria-label="Изтрий пожелание"
                        className="rounded-md p-1 text-red-600 opacity-70 hover:bg-red-50 hover:opacity-100"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </AdminConfirmForm>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {shownWishes.length < visibleWishes.length ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            className="rounded-full border border-boutique-sage-deep/30 px-5 py-2 text-xs font-semibold text-boutique-sage-deep"
          >
            Покажи още {Math.min(PAGE_SIZE, visibleWishes.length - shownWishes.length)}
          </button>
        </div>
      ) : null}

      {visibleWishes.length === 0 ? (
        <p className="mt-4 text-center text-sm text-boutique-muted">
          Няма пожелания, които отговарят на избраните филтри.
        </p>
      ) : null}
    </div>
  );
}
