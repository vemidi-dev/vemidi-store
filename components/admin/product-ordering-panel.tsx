"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition, type DragEvent } from "react";

import { saveProductOrdering } from "@/app/admin/actions";
import { ProductPublicationBadge } from "@/components/admin/product-publication-badge";
import { adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import type { AdminData } from "@/lib/admin/data";
import {
  compareCatalogSortOrder,
  compareHomeFeaturedSortOrder,
  moveItemDown,
  moveItemToBottom,
  moveItemToTop,
  moveItemUp,
  type ProductOrderScope,
} from "@/lib/admin/product-ordering";
import {
  normalizeProductPublicationStatus,
} from "@/lib/product-publication";
import { isProductCatalogVisible } from "@/lib/product-visibility";

type ProductOrderingPanelProps = {
  data: AdminData;
  initialScope?: ProductOrderScope;
};

type OrderingItem = {
  id: string;
  name: string;
  slug: string;
  productCode: string;
  thumbnailUrl: string | null;
  sortOrder: number;
  publicationStatus: ReturnType<typeof normalizeProductPublicationStatus>;
  isSoldOut: boolean;
};

const scopeLabels: Record<ProductOrderScope, string> = {
  home: "Начална страница",
  catalog: "Всички продукти",
};

function getProductThumbnail(
  imagesByProductId: AdminData["imagesByProductId"],
  product: AdminData["products"][number],
) {
  const images = imagesByProductId.get(product.id) ?? [];
  const primaryImage = images.find((image) => image.is_primary) ?? images[0];
  return primaryImage?.image_url ?? product.image_url ?? null;
}

function buildHomeOrderingItems(data: AdminData): OrderingItem[] {
  return data.products
    .filter((product) => data.featuredProductById.has(product.id))
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      productCode: product.product_code,
      thumbnailUrl: getProductThumbnail(data.imagesByProductId, product),
      sortOrder: data.featuredProductById.get(product.id)?.sort_order ?? 0,
      publicationStatus: normalizeProductPublicationStatus(product.status, "draft"),
      isSoldOut: product.is_sold_out,
    }))
    .sort((left, right) =>
      compareHomeFeaturedSortOrder(
        { sortOrder: left.sortOrder, name: left.name },
        { sortOrder: right.sortOrder, name: right.name },
      ),
    );
}

function buildCatalogOrderingItems(data: AdminData): OrderingItem[] {
  return data.products
    .filter(
      (product) =>
        normalizeProductPublicationStatus(product.status, "draft") === "published" &&
        isProductCatalogVisible(product.visibility),
    )
    .map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      productCode: product.product_code,
      thumbnailUrl: getProductThumbnail(data.imagesByProductId, product),
      sortOrder: product.catalog_sort_order ?? 0,
      publicationStatus: normalizeProductPublicationStatus(product.status, "draft"),
      isSoldOut: product.is_sold_out,
    }))
    .sort((left, right) =>
      compareCatalogSortOrder(
        {
          catalogSortOrder: left.sortOrder,
          createdAt: data.products.find((product) => product.id === left.id)?.created_at,
          id: left.id,
        },
        {
          catalogSortOrder: right.sortOrder,
          createdAt: data.products.find((product) => product.id === right.id)?.created_at,
          id: right.id,
        },
      ),
    );
}

function ProductOrderingThumbnail({
  thumbnailUrl,
  productName,
}: {
  thumbnailUrl: string | null;
  productName: string;
}) {
  return (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-boutique-line bg-white shadow-sm">
      {thumbnailUrl ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          role="img"
          aria-label={productName}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-[10px] text-boutique-muted">
          —
        </div>
      )}
    </div>
  );
}

export function ProductOrderingPanel({
  data,
  initialScope = "home",
}: ProductOrderingPanelProps) {
  const [scope, setScope] = useState<ProductOrderScope>(initialScope);
  const [items, setItems] = useState<OrderingItem[]>(() =>
    initialScope === "catalog"
      ? buildCatalogOrderingItems(data)
      : buildHomeOrderingItems(data),
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const sourceItems = useMemo(
    () =>
      scope === "catalog"
        ? buildCatalogOrderingItems(data)
        : buildHomeOrderingItems(data),
    [data, scope],
  );

  useEffect(() => {
    setItems(sourceItems);
    setDraggedIndex(null);
  }, [sourceItems]);

  const handleScopeChange = (nextScope: ProductOrderScope) => {
    setScope(nextScope);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      return;
    }

    setItems((current) => {
      const next = [...current];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = (formData: FormData) => {
    startTransition(() => saveProductOrdering(formData));
  };

  return (
    <article className={adminPanelClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-boutique-ink">Подредба на продукти</h2>
          <p className="mt-1 text-sm text-boutique-muted">
            Подредете featured продуктите на началната страница или default реда в каталога.
          </p>
        </div>
        <Link
          href="/admin?tab=products"
          className="rounded-lg border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/40"
        >
          ← Към списъка с продукти
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-b border-boutique-line pb-3">
        {(Object.keys(scopeLabels) as ProductOrderScope[]).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => handleScopeChange(entry)}
            aria-pressed={scope === entry}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              scope === entry
                ? "bg-boutique-ink text-boutique-paper"
                : "border border-boutique-line text-boutique-ink hover:border-boutique-sage-deep/40"
            }`}
          >
            {scopeLabels[entry]}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">
          {scope === "home"
            ? "Няма продукти, маркирани за началната страница. Включете ги от „Витрина и свързани продукти“."
            : "Няма публикувани продукти за каталога."}
        </p>
      ) : (
        <form action={handleSubmit} className="mt-5 space-y-4">
          <input
            type="hidden"
            name={adminFormFields.productOrdering.scope}
            value={scope}
          />
          {items.map((item) => (
            <input
              key={item.id}
              type="hidden"
              name={adminFormFields.productOrdering.productIds}
              value={item.id}
            />
          ))}

          <ul className="space-y-2">
            {items.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-xl border border-boutique-line bg-white px-3 py-3 shadow-boutique-sm transition ${
                  draggedIndex === index ? "border-boutique-sage-deep/50 opacity-70" : ""
                }`}
              >
                <span
                  className="cursor-grab select-none px-1 text-boutique-muted"
                  aria-hidden
                >
                  ⋮⋮
                </span>

                <ProductOrderingThumbnail
                  thumbnailUrl={item.thumbnailUrl}
                  productName={item.name}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-boutique-ink">{item.name}</p>
                    <ProductPublicationBadge status={item.publicationStatus} />
                    {item.isSoldOut ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800">
                        Изчерпан
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-boutique-muted">
                    {item.slug} · {item.productCode}
                  </p>
                  <p className="mt-1 text-[11px] text-boutique-muted/80">
                    Текуща позиция: {item.sortOrder || "—"}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setItems((current) => moveItemToTop(current, index))}
                    disabled={index === 0}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-boutique-muted transition hover:bg-boutique-bg disabled:opacity-40"
                  >
                    Най-горе
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((current) => moveItemUp(current, index))}
                    disabled={index === 0}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-boutique-muted transition hover:bg-boutique-bg disabled:opacity-40"
                  >
                    Нагоре
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((current) => moveItemDown(current, index))}
                    disabled={index === items.length - 1}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-boutique-muted transition hover:bg-boutique-bg disabled:opacity-40"
                  >
                    Надолу
                  </button>
                  <button
                    type="button"
                    onClick={() => setItems((current) => moveItemToBottom(current, index))}
                    disabled={index === items.length - 1}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-boutique-muted transition hover:bg-boutique-bg disabled:opacity-40"
                  >
                    Най-долу
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-boutique-line pt-4">
            <p className="text-xs text-boutique-muted">
              При запис позициите се нормализират на стъпка 10 (10, 20, 30…).
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-boutique-ink px-4 py-2 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent disabled:opacity-60"
            >
              {isPending ? "Запазване..." : "Запази подредбата"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
