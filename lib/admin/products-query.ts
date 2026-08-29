import type { SupabaseClient } from "@supabase/supabase-js";

import type { CategoryRow, ProductRow } from "@/lib/admin/types";
import {
  normalizeProductPublicationStatus,
  type ProductPublicationStatus,
} from "@/lib/product-publication";

export const PRODUCT_PAGE_SIZE_DEFAULT = 30;
export const PRODUCT_PAGE_SIZE_MAX = 100;

export const PRODUCT_AVAILABILITY_VALUES = [
  "active",
  "sold-out",
  "featured",
  "customizable",
] as const;

export type ProductAvailabilityFilter =
  | (typeof PRODUCT_AVAILABILITY_VALUES)[number]
  | "";

export const PRODUCT_SORT_VALUES = [
  "order-desc",
  "order-asc",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
] as const;

export type ProductSortValue = (typeof PRODUCT_SORT_VALUES)[number];

export type ProductsQuery = {
  search: string;
  /** @deprecated Prefer productCategoryId / materialCategoryId / occasionCategoryId */
  categoryId: string;
  productCategoryId: string;
  materialCategoryId: string;
  occasionCategoryId: string;
  availability: ProductAvailabilityFilter;
  status: ProductPublicationStatus | "";
  sort: ProductSortValue;
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

function normalizeUuid(value: string | undefined) {
  const trimmed = (value ?? "").trim();
  return isUuid(trimmed) ? trimmed : "";
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

function normalizeAvailability(raw: string): ProductAvailabilityFilter {
  return (PRODUCT_AVAILABILITY_VALUES as readonly string[]).includes(raw)
    ? (raw as ProductAvailabilityFilter)
    : "";
}

function normalizeSort(raw: string): ProductSortValue {
  return (PRODUCT_SORT_VALUES as readonly string[]).includes(raw)
    ? (raw as ProductSortValue)
    : "order-desc";
}

export function getRequiredCategoryFilterIds(query: ProductsQuery): string[] {
  return [
    query.productCategoryId,
    query.materialCategoryId,
    query.occasionCategoryId,
    query.categoryId,
  ].filter(Boolean);
}

export function parseProductsQuery(params: {
  q?: string;
  category?: string;
  productCat?: string;
  materialCat?: string;
  occasionCat?: string;
  availability?: string;
  status?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
}): ProductsQuery {
  const statusRaw = (params.status ?? "").trim();
  const status =
    statusRaw === "draft" || statusRaw === "published" || statusRaw === "archived"
      ? statusRaw
      : "";

  return {
    search: sanitizeProductSearchTerm(params.q ?? ""),
    categoryId: normalizeUuid(params.category),
    productCategoryId: normalizeUuid(params.productCat),
    materialCategoryId: normalizeUuid(params.materialCat),
    occasionCategoryId: normalizeUuid(params.occasionCat),
    availability: normalizeAvailability((params.availability ?? "").trim()),
    status,
    sort: normalizeSort((params.sort ?? "").trim()),
    page: normalizePage(params.page ?? ""),
    pageSize: normalizePageSize(params.pageSize ?? ""),
  };
}

export function parseProductsQueryFromFormData(formData: FormData): ProductsQuery {
  return parseProductsQuery({
    q: String(formData.get("q") ?? ""),
    category: String(formData.get("category") ?? ""),
    productCat: String(formData.get("product_cat") ?? ""),
    materialCat: String(formData.get("material_cat") ?? ""),
    occasionCat: String(formData.get("occasion_cat") ?? ""),
    availability: String(formData.get("availability") ?? ""),
    status: String(formData.get("status") ?? ""),
    sort: String(formData.get("sort") ?? ""),
    page: String(formData.get("page") ?? ""),
    pageSize: String(formData.get("page_size") ?? ""),
  });
}

export function makeAdminProductsHref(
  partial: Partial<{
    q: string;
    category: string;
    productCat: string;
    materialCat: string;
    occasionCat: string;
    availability: string;
    status: string;
    sort: string;
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
  const productCat = partial.productCat ?? base.productCategoryId ?? "";
  const materialCat = partial.materialCat ?? base.materialCategoryId ?? "";
  const occasionCat = partial.occasionCat ?? base.occasionCategoryId ?? "";
  const availability = partial.availability ?? base.availability ?? "";
  const status = partial.status ?? base.status ?? "";
  const sort = partial.sort ?? base.sort ?? "order-desc";
  const page = partial.page ?? base.page ?? 1;
  const pageSize = partial.pageSize ?? base.pageSize ?? PRODUCT_PAGE_SIZE_DEFAULT;
  const editProduct = partial.editProduct ?? base.editProduct ?? "";

  if (search) {
    params.set("q", search);
  }
  if (category) {
    params.set("category", category);
  }
  if (productCat) {
    params.set("product_cat", productCat);
  }
  if (materialCat) {
    params.set("material_cat", materialCat);
  }
  if (occasionCat) {
    params.set("occasion_cat", occasionCat);
  }
  if (availability) {
    params.set("availability", availability);
  }
  if (status) {
    params.set("status", status);
  }
  if (sort && sort !== "order-desc") {
    params.set("sort", sort);
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

export function productsQueryToSearchParams(
  query: ProductsQuery,
  extra?: Record<string, string>,
): URLSearchParams {
  const href = makeAdminProductsHref(
    {
      success: extra?.success,
      error: extra?.error,
      editProduct: extra?.editProduct,
    },
    query,
  );
  return new URLSearchParams(href.replace(/^\/admin\?/, ""));
}

function intersectIdSets(sets: string[][]): string[] {
  if (sets.length === 0) {
    return [];
  }
  let current = new Set(sets[0]);
  for (let index = 1; index < sets.length; index += 1) {
    const next = new Set(sets[index]);
    current = new Set([...current].filter((id) => next.has(id)));
    if (current.size === 0) {
      return [];
    }
  }
  return [...current];
}

async function loadProductIdsForCategory(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<{ ids: string[]; error: string | null }> {
  const { data, error } = await supabase
    .from("product_categories")
    .select("product_id")
    .eq("category_id", categoryId);

  if (error) {
    return { ids: [], error: error.message };
  }

  return {
    ids: [
      ...new Set(
        (data ?? [])
          .map((row) => (typeof row.product_id === "string" ? row.product_id : ""))
          .filter(Boolean),
      ),
    ],
    error: null,
  };
}

export async function loadAdminProductsPage(
  supabase: SupabaseClient,
  query: ProductsQuery,
): Promise<AdminProductsPageResult> {
  let productIdsFilter: string[] | null = null;
  const requiredCategoryIds = getRequiredCategoryFilterIds(query);

  if (requiredCategoryIds.length > 0) {
    const categoryResults = await Promise.all(
      requiredCategoryIds.map((categoryId) =>
        loadProductIdsForCategory(supabase, categoryId),
      ),
    );
    const firstError = categoryResults.find((result) => result.error)?.error;
    if (firstError) {
      return {
        products: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        categoryById: new Map(),
        error: { message: firstError },
      };
    }

    productIdsFilter = intersectIdSets(categoryResults.map((result) => result.ids));
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

  if (query.availability === "featured") {
    const { data: featuredRows, error: featuredError } = await supabase
      .from("home_featured_products")
      .select("product_id");

    if (featuredError) {
      return {
        products: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        categoryById: new Map(),
        error: { message: featuredError.message },
      };
    }

    const featuredIds = [
      ...new Set(
        (featuredRows ?? [])
          .map((row) => (typeof row.product_id === "string" ? row.product_id : ""))
          .filter(Boolean),
      ),
    ];

    productIdsFilter = productIdsFilter
      ? intersectIdSets([productIdsFilter, featuredIds])
      : featuredIds;

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
  if (query.availability === "active") {
    request = request.eq("is_sold_out", false);
  } else if (query.availability === "sold-out") {
    request = request.eq("is_sold_out", true);
  } else if (query.availability === "customizable") {
    request = request.eq("is_customizable", true);
  }
  if (query.search) {
    const term = `%${query.search}%`;
    request = request.or(
      `name.ilike.${term},slug.ilike.${term},product_code.ilike.${term}`,
    );
  }

  switch (query.sort) {
    case "order-asc":
      request = request.order("created_at", { ascending: true, nullsFirst: false });
      break;
    case "name-asc":
      request = request.order("name", { ascending: true });
      break;
    case "name-desc":
      request = request.order("name", { ascending: false });
      break;
    case "price-asc":
      request = request.order("price", { ascending: true, nullsFirst: false });
      break;
    case "price-desc":
      request = request.order("price", { ascending: false, nullsFirst: false });
      break;
    case "order-desc":
    default:
      request = request.order("created_at", { ascending: false, nullsFirst: false });
      break;
  }

  request = request.range(offset, offset + query.pageSize - 1);

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
