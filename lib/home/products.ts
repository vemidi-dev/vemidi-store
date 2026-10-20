import type { Product } from "@/lib/catalog";
import { compareCatalogSortOrder } from "@/lib/admin/product-ordering";

export const HOME_PRODUCT_PAGE_SIZE = 8;
export type HomeProductPage = { products: Product[]; nextOffset: number; total: number };
export type HomeProductOrderRow = { id: string; catalog_sort_order: number | null; created_at: string | null };

export function orderedHomeProductIds(rows: HomeProductOrderRow[], featured: { product_id: string }[]): string[] {
  const published = new Set(rows.map(row => row.id));
  const ordered = [...rows].sort((a, b) => compareCatalogSortOrder(
    { id: a.id, catalogSortOrder: a.catalog_sort_order ?? 0, createdAt: a.created_at },
    { id: b.id, catalogSortOrder: b.catalog_sort_order ?? 0, createdAt: b.created_at },
  ));
  return [...new Set([...featured.map(row => row.product_id).filter(id => published.has(id)), ...ordered.map(row => row.id)])];
}

export function parseHomeProductOffset(value: string | null): number | null {
  if (value === null) return 0;
  if (!/^(0|[1-9]\d{0,4})$/.test(value)) return null;
  const offset = Number(value);
  return offset <= 10000 && offset % HOME_PRODUCT_PAGE_SIZE === 0 ? offset : null;
}
