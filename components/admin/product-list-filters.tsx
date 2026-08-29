"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { adminFieldClass } from "@/components/admin/styles";
import {
  makeAdminProductsHref,
  type ProductsQuery,
} from "@/lib/admin/products-query";
import type { CategoryRow } from "@/lib/admin/types";
import {
  getCategoryDisplayLabel,
  sortCategoriesForDisplay,
} from "@/lib/category-hierarchy";
import { PRODUCT_PUBLICATION_STATUS_LABELS } from "@/lib/product-publication";

const SEARCH_DEBOUNCE_MS = 400;

type ProductListFiltersProps = {
  query: ProductsQuery;
  categories: CategoryRow[];
};

export function ProductListFilters({ query, categories }: ProductListFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.search);
  const skipSearchDebounceRef = useRef(true);

  const productCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "product"),
  );
  const materialCategories = sortCategoriesForDisplay(
    categories.filter((category) => category.category_type === "material"),
  );
  const occasionCategories = categories.filter(
    (category) => category.category_type === "occasion",
  );

  useEffect(() => {
    setSearch(query.search);
    skipSearchDebounceRef.current = true;
  }, [query.search]);

  function navigate(next: Partial<{
    q: string;
    productCat: string;
    materialCat: string;
    occasionCat: string;
    availability: string;
    status: string;
    sort: string;
    pageSize: number;
    page: number;
  }>) {
    const href = makeAdminProductsHref(
      {
        q: next.q ?? search,
        productCat: next.productCat ?? query.productCategoryId,
        materialCat: next.materialCat ?? query.materialCategoryId,
        occasionCat: next.occasionCat ?? query.occasionCategoryId,
        availability: next.availability ?? query.availability,
        status: next.status ?? query.status,
        sort: next.sort ?? query.sort,
        pageSize: next.pageSize ?? query.pageSize,
        page: next.page ?? 1,
        category: "",
      },
      {
        ...query,
        categoryId: "",
        search: next.q ?? search,
      },
    );
    startTransition(() => {
      router.push(href);
    });
  }

  useEffect(() => {
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return;
    }
    if (search === query.search) {
      return;
    }
    const timer = window.setTimeout(() => {
      navigate({ q: search, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce only on search text
  }, [search]);

  return (
    <div
      className={`mt-5 grid gap-3 rounded-xl border border-boutique-line/70 bg-boutique-bg/40 p-3 md:grid-cols-2 xl:grid-cols-4 ${
        isPending ? "opacity-70" : ""
      }`}
      aria-busy={isPending}
    >
      <label className="text-sm font-medium text-boutique-ink xl:col-span-2">
        Търсене
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Име, slug или код"
          className={adminFieldClass}
        />
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        Наличност
        <select
          value={query.availability}
          onChange={(event) =>
            navigate({ availability: event.target.value, page: 1 })
          }
          className={adminFieldClass}
        >
          <option value="">Всички</option>
          <option value="active">Активни</option>
          <option value="sold-out">Изчерпани</option>
          <option value="featured">На началната</option>
          <option value="customizable">С персонализация</option>
        </select>
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        Статус
        <select
          value={query.status}
          onChange={(event) => navigate({ status: event.target.value, page: 1 })}
          className={adminFieldClass}
        >
          <option value="">Всички</option>
          <option value="draft">{PRODUCT_PUBLICATION_STATUS_LABELS.draft}</option>
          <option value="published">
            {PRODUCT_PUBLICATION_STATUS_LABELS.published}
          </option>
          <option value="archived">
            {PRODUCT_PUBLICATION_STATUS_LABELS.archived}
          </option>
        </select>
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        Категория
        <select
          value={query.productCategoryId}
          onChange={(event) =>
            navigate({ productCat: event.target.value, page: 1 })
          }
          className={adminFieldClass}
        >
          <option value="">Всички</option>
          {productCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryDisplayLabel(categories, category)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        Заготовки и материали
        <select
          value={query.materialCategoryId}
          onChange={(event) =>
            navigate({ materialCat: event.target.value, page: 1 })
          }
          className={adminFieldClass}
        >
          <option value="">Всички</option>
          {materialCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryDisplayLabel(categories, category)}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        Повод
        <select
          value={query.occasionCategoryId}
          onChange={(event) =>
            navigate({ occasionCat: event.target.value, page: 1 })
          }
          className={adminFieldClass}
        >
          <option value="">Всички</option>
          {occasionCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        Сортиране
        <select
          value={query.sort}
          onChange={(event) => navigate({ sort: event.target.value, page: 1 })}
          className={adminFieldClass}
        >
          <option value="order-desc">Най-нови</option>
          <option value="order-asc">Най-стари</option>
          <option value="name-asc">Име А–Я</option>
          <option value="name-desc">Име Я–А</option>
          <option value="price-asc">Цена ↑</option>
          <option value="price-desc">Цена ↓</option>
        </select>
      </label>
      <label className="text-sm font-medium text-boutique-ink">
        На страница
        <select
          value={String(query.pageSize)}
          onChange={(event) =>
            navigate({
              pageSize: Number.parseInt(event.target.value, 10) || 30,
              page: 1,
            })
          }
          className={adminFieldClass}
        >
          <option value="10">10</option>
          <option value="30">30</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </label>
      <div className="flex items-end xl:col-span-4">
        <Link
          href="/admin?tab=products"
          className="rounded-lg border border-boutique-line px-4 py-2 text-sm font-medium text-boutique-muted transition hover:text-boutique-ink"
        >
          Изчисти
        </Link>
      </div>
    </div>
  );
}
