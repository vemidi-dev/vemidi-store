import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryRow, ProductRow } from "@/lib/admin/types";
import {
  normalizeProductPublicationStatus,
  type ProductPublicationStatus,
} from "@/lib/product-publication";

export const PRODUCT_PAGE_SIZE_DEFAULT = 30;
export const PRODUCT_PAGE_SIZE_MAX = 100;

export type ProductsQuery = {
  search: string;
  categoryId: string;
  status: ProductPublicationStatus | "";
  page: number;
  pageSize: number;
};

export type AdminProductListRow = Pick<
  ProductRow,
  | "id"
  | "name"
  | "slug"
  | "product_code"
  | "price"
  | "status"
  | "visibility"
  | "is_sold_out"
  | "is_customizable"
  | "fulfillment_type"
  | "stock_quantity"
  | "image_url"
  | "created_at"
  | "catalog_sort_order"
> & {
  categoryIds: string[];
  isFeatured: boolean;
};

export type AdminProductsPageResult = {
  products: AdminProductListRow[];
  total: number;
  page: number;
  pageSize: number;
  categoryById: Map<string, CategoryRow>;
  error: { message: string } | null;
};

const PRODUCT_LIST_SELECT =
  "id,name,slug,product_code,price,status,visibility,is_sold_out,is_customizable,fulfillment_type,stock_quantity,image_url,created_at,catalog_sort_order";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

export function sanitizeProductSearchTerm(value: string) {
  return value.trim().replace(/[%_,]/g, " ").replace(/\s+/g, " ").slice(0, 120);
}

function normalizePage(raw: string) {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function normalizePageSize(raw: string) {
  if (!raw.trim()) {
    return PRODUCT_PAGE_SIZE_DEFAULT;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return PRODUCT_PAGE_SIZE_DEFAULT;
  }
  return Math.min(parsed, PRODUCT_PAGE_SIZE_MAX);
}

export function parseProductsQuery(params: {
  q?: string;
  category?: string;
  status?: string;
  page?: string;
  pageSize?: string;
}): ProductsQuery {
  const statusRaw = (params.status ?? "").trim();
  const status =
    statusRaw === "draft" || statusRaw === "published" || statusRaw === "archived"
      ? statusRaw
      : "";
  const categoryId = (params.category ?? "").trim();

  return {
    search: sanitizeProductSearchTerm(params.q ?? ""),
    categoryId: isUuid(categoryId) ? categoryId : "",
    status,
    page: normalizePage(params.page ?? ""),
    pageSize: normalizePageSize(params.pageSize ?? ""),
  };
}

export function makeAdminProductsHref(
  partial: Partial<{
    q: string;
    category: string;
    status: string;
    page: number;
    pageSize: number;
    editProduct: string;
    productsView: string;
    orderingScope: string;
    success: string;
    error: string;
  }> = {},
  base: Partial<ProductsQuery> & { editProduct?: string } = {},
) {
  const params = new URLSearchParams();
  params.set("tab", "products");

  const search = partial.q ?? base.search ?? "";
  const category = partial.category ?? base.categoryId ?? "";
  const status = partial.status ?? base.status ?? "";
  const page = partial.page ?? base.page ?? 1;
  const pageSize = partial.pageSize ?? base.pageSize ?? PRODUCT_PAGE_SIZE_DEFAULT;
  const editProduct = partial.editProduct ?? base.editProduct ?? "";

  if (search) {
    params.set("q", search);
  }
  if (category) {
    params.set("category", category);
  }
  if (status) {
    params.set("status", status);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  if (pageSize !== PRODUCT_PAGE_SIZE_DEFAULT) {
    params.set("page_size", String(pageSize));
  }
  if (editProduct) {
    params.set("editProduct", editProduct);
  }
  if (partial.productsView) {
    params.set("productsView", partial.productsView);
  }
  if (partial.orderingScope) {
    params.set("orderingScope", partial.orderingScope);
  }
  if (partial.success) {
    params.set("success", partial.success);
  }
  if (partial.error) {
    params.set("error", partial.error);
  }

  return `/admin?${params.toString()}`;
}

export async function loadAdminProductsPage(
  supabase: SupabaseClient,
  query: ProductsQuery,
): Promise<AdminProductsPageResult> {
  let productIdsFilter: string[] | null = null;

  if (query.categoryId) {
    const { data: links, error: linksError } = await supabase
      .from("product_categories")
      .select("product_id")
      .eq("category_id", query.categoryId);

    if (linksError) {
      return {
        products: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        categoryById: new Map(),
        error: { message: linksError.message },
      };
    }

    productIdsFilter = [
      ...new Set(
        (links ?? [])
          .map((row) => (typeof row.product_id === "string" ? row.product_id : ""))
          .filter(Boolean),
      ),
    ];

    if (productIdsFilter.length === 0) {
      return {
        products: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        categoryById: new Map(),
        error: null,
      };
    }
  }

  const offset = (query.page - 1) * query.pageSize;
  let request = supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT, { count: "exact" });

  if (productIdsFilter) {
    request = request.in("id", productIdsFilter);
  }
  if (query.status) {
    request = request.eq("status", query.status);
  }
  if (query.search) {
    const term = `%${query.search}%`;
    request = request.or(
      `name.ilike.${term},slug.ilike.${term},product_code.ilike.${term}`,
    );
  }

  request = request
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + query.pageSize - 1);

  const { data, error, count } = await request;
  const rows = (data ?? []) as Array<
    Pick<
      ProductRow,
      | "id"
      | "name"
      | "slug"
      | "product_code"
      | "price"
      | "status"
      | "visibility"
      | "is_sold_out"
      | "is_customizable"
      | "fulfillment_type"
      | "stock_quantity"
      | "image_url"
      | "created_at"
      | "catalog_sort_order"
    >
  >;

  const pageIds = rows.map((row) => row.id);
  const categoryById = new Map<string, CategoryRow>();
  const categoryIdsByProductId = new Map<string, string[]>();
  const featuredIds = new Set<string>();

  if (pageIds.length > 0) {
    const [linksResult, featuredResult] = await Promise.all([
      supabase
        .from("product_categories")
        .select("product_id,category_id")
        .in("product_id", pageIds),
      supabase
        .from("home_featured_products")
        .select("product_id,sort_order")
        .in("product_id", pageIds),
    ]);

    for (const link of linksResult.data ?? []) {
      const productId = String(link.product_id ?? "");
      const categoryId = String(link.category_id ?? "");
      if (!productId || !categoryId) {
        continue;
      }
      const ids = categoryIdsByProductId.get(productId) ?? [];
      ids.push(categoryId);
      categoryIdsByProductId.set(productId, ids);
    }
    for (const row of featuredResult.data ?? []) {
      if (typeof row.product_id === "string") {
        featuredIds.add(row.product_id);
      }
    }

    if (linksResult.error || featuredResult.error) {
      return {
        products: [],
        total: count ?? 0,
        page: query.page,
        pageSize: query.pageSize,
        categoryById,
        error: {
          message:
            linksResult.error?.message ||
            featuredResult.error?.message ||
            "Грешка при зареждане на продуктите.",
        },
      };
    }
  }

  return {
    products: rows.map((row) => ({
      ...row,
      status: normalizeProductPublicationStatus(row.status, "published"),
      categoryIds: categoryIdsByProductId.get(row.id) ?? [],
      isFeatured: featuredIds.has(row.id),
    })),
    total: count ?? 0,
    page: query.page,
    pageSize: query.pageSize,
    categoryById,
    error: error ? { message: error.message } : null,
  };
}
