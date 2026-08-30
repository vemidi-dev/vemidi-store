import Link from "next/link";

import {
  deleteProduct,
  publishProduct,
  toggleProductSoldOut,
} from "@/app/admin/actions";
import { AdminConfirmForm } from "@/components/admin/admin-confirm-form";
import { ProductDuplicateButton } from "@/components/admin/product-duplicate-button";
import { ProductListFilters } from "@/components/admin/product-list-filters";
import { ProductPublicationBadge } from "@/components/admin/product-publication-badge";
import { adminPanelClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { getAdminProductPreviewPath } from "@/lib/admin/product-preview-path";
import {
  makeAdminProductsHref,
  type AdminProductListRow,
  type ProductsQuery,
} from "@/lib/admin/products-query";
import type { CategoryRow } from "@/lib/admin/types";
import { formatAdminFulfillmentListStatus } from "@/lib/product-fulfillment";
import { normalizeProductPublicationStatus } from "@/lib/product-publication";

const productCardClass =
  "group/product rounded-xl border border-boutique-line bg-white shadow-boutique-sm transition hover:border-boutique-sage/25 hover:shadow-md";

const productHeaderClass =
  "flex flex-col gap-3 rounded-xl px-3 py-3 lg:flex-row lg:items-center";

const actionPrimaryClass =
  "rounded-lg bg-boutique-ink px-3 py-1.5 text-xs font-semibold text-boutique-paper transition hover:bg-boutique-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/30";

const actionSecondaryClass =
  "rounded-lg px-2.5 py-1.5 text-xs font-medium text-boutique-muted transition hover:bg-white hover:text-boutique-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-accent/20";

const actionDangerClass =
  "rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600/90 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200";

const categoryChipClass =
  "inline-flex max-w-[10rem] truncate rounded-full border border-boutique-line/80 bg-white px-2 py-0.5 text-[10px] font-medium text-boutique-muted";

function ProductThumbnail({
  thumbnailUrl,
  productName,
}: {
  thumbnailUrl: string | null | undefined;
  productName: string;
}) {
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-boutique-line bg-white shadow-sm">
      {thumbnailUrl ? (
        <div
          className="h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
          role="img"
          aria-label={productName}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-[9px] text-boutique-muted">
          —
        </div>
      )}
    </div>
  );
}

function ProductsQueryHiddenFields({ query }: { query: ProductsQuery }) {
  return (
    <>
      <input type="hidden" name="q" value={query.search} />
      <input type="hidden" name="product_cat" value={query.productCategoryId} />
      <input type="hidden" name="material_cat" value={query.materialCategoryId} />
      <input type="hidden" name="occasion_cat" value={query.occasionCategoryId} />
      <input type="hidden" name="availability" value={query.availability} />
      <input type="hidden" name="status" value={query.status} />
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="page" value={String(query.page)} />
      <input type="hidden" name="page_size" value={String(query.pageSize)} />
    </>
  );
}

type ProductListSlimPanelProps = {
  products: AdminProductListRow[];
  total: number;
  query: ProductsQuery;
  categories: CategoryRow[];
  categoryById: Map<string, CategoryRow>;
  error?: string | null;
  editProductId?: string;
};

export function ProductListSlimPanel({
  products,
  total,
  query,
  categories,
  categoryById,
  error,
  editProductId,
}: ProductListSlimPanelProps) {
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const closeEditHref = makeAdminProductsHref({}, query);

  return (
    <article className={adminPanelClass}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl text-boutique-ink">Всички продукти</h2>
          <p className="mt-1 text-sm text-boutique-muted">
            {total} продукта · server-side търсене, филтри и пагинация
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin?tab=products&productsView=import"
            className="rounded-lg border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/40"
          >
            Импорт от JSON
          </Link>
          <Link
            href="/admin?tab=products&productsView=ordering&orderingScope=home"
            className="rounded-lg border border-boutique-line px-3 py-1.5 text-xs font-semibold text-boutique-ink transition hover:border-boutique-sage-deep/40"
          >
            Подредба на продукти
          </Link>
        </div>
      </div>

      <ProductListFilters query={query} categories={categories} />

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {products.length === 0 ? (
        <p className="mt-5 text-sm text-boutique-muted">Няма продукти за този филтър.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {products.map((product) => {
            const assignedCategories = product.categoryIds
              .map((id) => categoryById.get(id))
              .filter((category): category is CategoryRow => category !== undefined);
            const publicationStatus = normalizeProductPublicationStatus(
              product.status,
              "published",
            );
            const fulfillmentStatus = formatAdminFulfillmentListStatus({
              soldOut: product.is_sold_out,
              fulfillmentType: product.fulfillment_type,
              stockQuantity: product.stock_quantity ?? null,
            });
            const editHref = makeAdminProductsHref(
              { editProduct: product.id, page: query.page },
              query,
            );
            const isEditing = editProductId === product.id;

            return (
              <article
                key={product.id}
                className={`${productCardClass} ${
                  isEditing ? "border-boutique-sage/40 ring-1 ring-boutique-sage/20" : ""
                }`}
              >
                <header className={productHeaderClass}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ProductThumbnail
                      thumbnailUrl={product.image_url}
                      productName={product.name}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-boutique-ink">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-boutique-muted">
                        {product.product_code || product.slug}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <ProductPublicationBadge status={publicationStatus} />
                        {product.is_sold_out ? (
                          <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                            Изчерпан
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-boutique-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-muted">
                            {fulfillmentStatus}
                          </span>
                        )}
                        {product.isFeatured ? (
                          <span className="inline-flex rounded-full bg-boutique-warm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-boutique-ink">
                            На началната
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {assignedCategories.length === 0 ? (
                          <span className={categoryChipClass}>Без категория</span>
                        ) : (
                          assignedCategories.map((category) => (
                            <span
                              key={`${product.id}-${category.id}`}
                              className={categoryChipClass}
                              title={category.name}
                            >
                              {category.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <p className="text-sm font-semibold text-boutique-ink">
                      {Number(product.price).toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-1 border-t border-boutique-line/50 pt-2 lg:w-auto lg:border-t-0 lg:pt-0">
                    {isEditing ? (
                      <Link href={closeEditHref} className={actionSecondaryClass}>
                        Затвори редакция
                      </Link>
                    ) : (
                      <Link href={editHref} className={actionPrimaryClass}>
                        Редакция
                      </Link>
                    )}
                    <a
                      href={getAdminProductPreviewPath(product.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={actionSecondaryClass}
                    >
                      Преглед
                    </a>
                    {publicationStatus === "draft" ? (
                      <form action={publishProduct} className="inline">
                        <input
                          type="hidden"
                          name={adminFormFields.common.id}
                          value={product.id}
                        />
                        <ProductsQueryHiddenFields query={query} />
                        <button type="submit" className={actionSecondaryClass}>
                          Публикуване
                        </button>
                      </form>
                    ) : null}
                    <ProductDuplicateButton
                      productId={product.id}
                      productName={product.name}
                      className={`${actionSecondaryClass} disabled:opacity-60`}
                    />
                    <form action={toggleProductSoldOut} className="inline">
                      <input type="hidden" name={adminFormFields.common.tab} value="products" />
                      <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                      <ProductsQueryHiddenFields query={query} />
                      <input
                        type="hidden"
                        name="sold_out_target"
                        value={product.is_sold_out ? "false" : "true"}
                      />
                      <button type="submit" className={actionSecondaryClass}>
                        {product.is_sold_out ? "Активирай" : "Изчерпан"}
                      </button>
                    </form>
                    <AdminConfirmForm
                      action={deleteProduct}
                      confirmMessage={`Сигурни ли сте, че искате да изтриете „${product.name}"?`}
                      className="inline"
                    >
                      <input type="hidden" name={adminFormFields.common.tab} value="products" />
                      <input type="hidden" name={adminFormFields.common.id} value={product.id} />
                      <ProductsQueryHiddenFields query={query} />
                      <button type="submit" className={actionDangerClass}>
                        Изтрий
                      </button>
                    </AdminConfirmForm>
                  </div>
                </header>
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-boutique-line/70 pt-4 text-sm"
          aria-label="Страници с продукти"
        >
          <p className="text-boutique-muted">
            Страница {query.page} от {totalPages}
          </p>
          <div className="flex gap-2">
            {query.page > 1 ? (
              <Link
                href={makeAdminProductsHref({ page: query.page - 1 }, query)}
                className="rounded-lg border border-boutique-line px-3 py-1.5 font-medium text-boutique-ink"
              >
                Предишна
              </Link>
            ) : null}
            {query.page < totalPages ? (
              <Link
                href={makeAdminProductsHref({ page: query.page + 1 }, query)}
                className="rounded-lg border border-boutique-line px-3 py-1.5 font-medium text-boutique-ink"
              >
                Следваща
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </article>
  );
}
