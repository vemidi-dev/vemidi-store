import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProductLandingPage,
  ProductLandingPageRow,
} from "@/lib/product-landing/types";

const landingPageSelectColumns =
  "id,product_id,title,slug,campaign_code,is_primary,is_active,sort_order";

export function toProductLandingPage(
  row: ProductLandingPageRow,
): ProductLandingPage {
  return {
    id: row.id,
    productId: row.product_id,
    title: row.title,
    slug: row.slug,
    campaignCode: row.campaign_code,
    isPrimary: row.is_primary,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

export function selectPrimaryActiveLandingPage(
  rows: readonly ProductLandingPageRow[],
  productId: string,
): ProductLandingPage | null {
  const candidates = rows.filter(
    (row) =>
      row.product_id === productId && row.is_primary === true && row.is_active === true,
  );

  if (candidates.length === 0) {
    return null;
  }

  const [selected] = [...candidates].sort((left, right) => {
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }

    return left.slug.localeCompare(right.slug);
  });

  return selected ? toProductLandingPage(selected) : null;
}

export async function getPrimaryActiveProductLandingPage(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductLandingPage | null> {
  const { data, error } = await supabase
    .from("product_landing_pages")
    .select(landingPageSelectColumns)
    .eq("product_id", productId)
    .eq("is_primary", true)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toProductLandingPage(data as ProductLandingPageRow);
}
