import { isUuid } from "@/lib/is-uuid";
import type { Product } from "@/lib/catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  toProduct,
  type ProductImageRow,
  type ProductRow,
} from "@/lib/storefront/mappers";
import type { ProductPromotionRow } from "@/lib/product-pricing";

export type ProductRouteResolution =
  | {
      kind: "page";
      product: Product;
      canonicalSlug: string;
    }
  | {
      kind: "redirect";
      targetSlug: string;
    }
  | {
      kind: "not_found";
    };

const productListColumns =
  "id,slug,product_code,name,description,additional_info,fulfillment_note,price,image_url,is_customizable,is_sold_out,card_badge";

async function loadProductRowById(supabase: SupabaseClient, productId: string) {
  const { data, error } = await supabase
    .from("products")
    .select(productListColumns)
    .eq("id", productId)
    .maybeSingle();

  return error || !data ? null : (data as ProductRow);
}

async function loadProductRowBySlug(supabase: SupabaseClient, slug: string) {
  const { data, error } = await supabase
    .from("products")
    .select(productListColumns)
    .eq("slug", slug)
    .maybeSingle();

  return error || !data ? null : (data as ProductRow);
}

async function loadHistoricalSlugTarget(
  supabase: SupabaseClient,
  slug: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("product_slug_history")
    .select("product_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data?.product_id) {
    return null;
  }

  const product = await loadProductRowById(supabase, String(data.product_id));
  return product?.slug ?? null;
}

export async function resolveProductRoute(
  supabase: SupabaseClient,
  routeParam: string,
  options?: {
    promotion?: ProductPromotionRow | null;
    imageRows?: ProductImageRow[];
  },
): Promise<ProductRouteResolution> {
  const param = routeParam.trim();
  if (!param) {
    return { kind: "not_found" };
  }

  if (isUuid(param)) {
    const row = await loadProductRowById(supabase, param);
    if (!row) {
      return { kind: "not_found" };
    }
    return { kind: "redirect", targetSlug: row.slug };
  }

  const row = await loadProductRowBySlug(supabase, param);
  if (row) {
    return {
      kind: "page",
      product: toProduct(row, options?.imageRows ?? [], options?.promotion ?? null),
      canonicalSlug: row.slug,
    };
  }

  const historicalSlug = await loadHistoricalSlugTarget(supabase, param);
  if (historicalSlug && historicalSlug !== param) {
    return { kind: "redirect", targetSlug: historicalSlug };
  }

  return { kind: "not_found" };
}
