import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProductMaterialRow,
  ProductVariantGroupRow,
} from "@/lib/admin/types";
import {
  DEFAULT_VARIANT_DISPLAY_SIZE,
  DEFAULT_VARIANT_GROUP_KEY,
  DEFAULT_VARIANT_GROUP_NAME,
  normalizeVariantDisplaySize,
} from "@/lib/product-variants";

const MATERIAL_BASE_COLUMNS =
  "id,name,description,image_url,is_active,sort_order,created_at,updated_at";
const MATERIAL_FULL_COLUMNS = `${MATERIAL_BASE_COLUMNS},group_id,display_size`;
const VARIANT_GROUP_COLUMNS =
  "id,key,name,description,sort_order,is_active,created_at,updated_at";

export function normalizeProductMaterialRow(
  row: ProductMaterialRow,
  fallbackGroupId: string | null = null,
): ProductMaterialRow {
  return {
    ...row,
    group_id: row.group_id ?? fallbackGroupId,
    display_size: normalizeVariantDisplaySize(row.display_size),
  };
}

export async function loadProductVariantGroups(
  supabase: SupabaseClient,
): Promise<{ groups: ProductVariantGroupRow[]; error: string | null }> {
  const result = await supabase
    .from("product_variant_groups")
    .select(VARIANT_GROUP_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (result.error) {
    return {
      groups: [
        {
          id: "fallback-material-group",
          key: DEFAULT_VARIANT_GROUP_KEY,
          name: DEFAULT_VARIANT_GROUP_NAME,
          description: null,
          sort_order: 0,
          is_active: true,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        },
      ],
      error: result.error.message,
    };
  }

  const groups = (result.data ?? []) as ProductVariantGroupRow[];
  if (groups.length === 0) {
    return {
      groups: [
        {
          id: "fallback-material-group",
          key: DEFAULT_VARIANT_GROUP_KEY,
          name: DEFAULT_VARIANT_GROUP_NAME,
          description: null,
          sort_order: 0,
          is_active: true,
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        },
      ],
      error: null,
    };
  }

  return { groups, error: null };
}

export async function loadProductMaterials(
  supabase: SupabaseClient,
  groups: ProductVariantGroupRow[] = [],
): Promise<{ materials: ProductMaterialRow[]; error: string | null }> {
  const materialGroupId =
    groups.find((group) => group.key === DEFAULT_VARIANT_GROUP_KEY)?.id ?? null;

  const full = await supabase
    .from("product_materials")
    .select(MATERIAL_FULL_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!full.error) {
    return {
      materials: ((full.data ?? []) as ProductMaterialRow[]).map((row) =>
        normalizeProductMaterialRow(row, materialGroupId),
      ),
      error: null,
    };
  }

  const basic = await supabase
    .from("product_materials")
    .select(MATERIAL_BASE_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (basic.error) {
    return { materials: [], error: basic.error.message };
  }

  return {
    materials: ((basic.data ?? []) as ProductMaterialRow[]).map((row) =>
      normalizeProductMaterialRow(
        {
          ...row,
          group_id: materialGroupId,
          display_size: DEFAULT_VARIANT_DISPLAY_SIZE,
        },
        materialGroupId,
      ),
    ),
    error: null,
  };
}

export async function resolveDefaultMaterialGroupId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const { data } = await supabase
    .from("product_variant_groups")
    .select("id")
    .eq("key", DEFAULT_VARIANT_GROUP_KEY)
    .maybeSingle();
  return typeof data?.id === "string" ? data.id : null;
}
