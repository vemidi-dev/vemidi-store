import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toProduct, type ProductRow } from "@/lib/storefront/mappers";
import type { ProductPromotionRow } from "@/lib/product-pricing";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const productIds = Array.isArray(body?.productIds)
    ? [...new Set<string>(body.productIds.filter((id: unknown): id is string =>
      typeof id === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)))].slice(0, 100)
    : [];
  const supabase = await createClient();
  if (!supabase || !productIds.length) return NextResponse.json({prices: []});
  const now = new Date().toISOString();
  const [products, promotions] = await Promise.all([
    supabase.from("products")
      .select("id,slug,product_code,name,description,price,image_url,is_customizable,quantity_price_tiers")
      .eq("status", "published").in("id", productIds),
    supabase.from("product_promotions")
      .select("id,product_id,name,discount_type,discount_value,starts_at,ends_at,is_active,created_at")
      .in("product_id", productIds).eq("is_active", true)
      .lte("starts_at", now).gt("ends_at", now).order("created_at", {ascending: false}),
  ]);
  // Keep the cart's current prices on a transient database error.
  if (products.error || promotions.error) return NextResponse.json({prices: []}, {status: 503});
  const active = new Map<string, ProductPromotionRow>();
  for (const promotion of (promotions.data ?? []) as ProductPromotionRow[]) {
    if (!active.has(promotion.product_id)) active.set(promotion.product_id, promotion);
  }
  const prices = ((products.data ?? []) as ProductRow[]).map(row => {
    const product = toProduct(row, [], active.get(row.id));
    return {productId: row.id, baseUnitPrice: product.price, quantityPriceTiers: product.quantityPriceTiers ?? []};
  });
  return NextResponse.json({prices}, {headers: {"Cache-Control": "no-store"}});
}
