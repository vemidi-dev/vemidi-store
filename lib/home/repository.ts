import { createClient } from "@supabase/supabase-js";
import type { BlogPostRow, CategoryRow } from "@/lib/admin/types";
import { siteContentDefaults, type SiteContent } from "@/lib/content/site-content";
import { SITE_MEDIA_KEYS, type SiteMediaKey, type SiteMediaRow } from "@/lib/content/site-media-types";
import { getGlobalFaqItems } from "@/lib/faq/repository";
import { HOME_PUBLIC_CACHE_SECONDS, HOME_PUBLIC_CACHE_TAG } from "@/lib/home/cache-tag";
import { HOME_PRODUCT_PAGE_SIZE, orderedHomeProductIds, type HomeProductOrderRow, type HomeProductPage } from "@/lib/home/products";
import { isPromotionActive, type ProductPromotionRow } from "@/lib/product-pricing";
import { mapStorefrontCategory, toProduct, type ProductImageRow, type ProductRow } from "@/lib/storefront/mappers";

// No session cookies or service-role key: shared caching is limited to public RLS data.
function publicHomeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Public home data is not configured");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: HOME_PUBLIC_CACHE_SECONDS, tags: [HOME_PUBLIC_CACHE_TAG] } }) },
  });
}

export type HomeBlogPost = Pick<BlogPostRow, "id" | "title" | "slug" | "image_url" | "published_at">;

export async function getHomeContent(): Promise<SiteContent> {
  const content = { ...siteContentDefaults } as SiteContent;
  try {
    const { data } = await publicHomeClient().from("site_content").select("key,value").throwOnError();
    for (const row of data ?? []) if (row.key in content && typeof row.value === "string") content[row.key as keyof SiteContent] = row.value;
  } catch { console.warn("Home content unavailable; using default copy"); }
  return content;
}

export async function getHomeMediaMap() {
  const map = Object.fromEntries(SITE_MEDIA_KEYS.map(key => [key, null])) as Record<SiteMediaKey, SiteMediaRow | null>;
  try {
    const { data } = await publicHomeClient().from("site_media")
      .select("key,label,section,sort_order,image_url,image_alt,updated_at").in("key", ["home.hero", "home.atelier"]).throwOnError();
    for (const row of data ?? []) if (SITE_MEDIA_KEYS.includes(row.key as SiteMediaKey)) map[row.key as SiteMediaKey] = row as SiteMediaRow;
  } catch { console.warn("Home media unavailable; using default images"); }
  return map;
}

export async function getHomeCategories() {
  const { data } = await publicHomeClient().from("categories")
    .select("id,name,slug,category_type,parent_id,image_url,image_alt,cover_image_url,cover_image_alt,show_on_home,home_sort_order,card_description,is_visible")
    .order("name").throwOnError();
  return ((data ?? []) as CategoryRow[]).map(mapStorefrontCategory);
}

export async function getHomeFeaturedPosts(): Promise<HomeBlogPost[]> {
  const { data } = await publicHomeClient().from("blog_posts")
    .select("id,title,slug,image_url,published_at").eq("is_published", true).eq("is_featured", true)
    .order("published_at", { ascending: false }).limit(3).throwOnError();
  return data ?? [];
}

export async function getHomeFaqItems() {
  return getGlobalFaqItems(publicHomeClient());
}

export async function getHomeProductPage(offset = 0): Promise<HomeProductPage> {
  const client = publicHomeClient();
  const [order, featured] = await Promise.all([
    client.from("products").select("id,catalog_sort_order,created_at").eq("status", "published").eq("visibility", "public").throwOnError(),
    client.from("home_featured_products").select("product_id").order("sort_order").throwOnError(),
  ]);
  const ids = orderedHomeProductIds((order.data ?? []) as HomeProductOrderRow[], featured.data ?? []);
  const pageIds = ids.slice(offset, offset + HOME_PRODUCT_PAGE_SIZE);
  const nextOffset = Math.min(offset + HOME_PRODUCT_PAGE_SIZE, ids.length);
  if (!pageIds.length) return { products: [], nextOffset, total: ids.length };
  const [rows, images, promotions, colors, personalization] = await Promise.all([
    client.from("products").select("id,slug,product_code,name,price,image_url,is_customizable,is_sold_out,fulfillment_type,stock_quantity,card_badge")
      .in("id", pageIds).eq("status", "published").eq("visibility", "public").throwOnError(),
    client.from("product_images").select("id,product_id,image_url,alt_text,sort_order,is_primary").in("product_id", pageIds).order("sort_order").throwOnError(),
    client.from("product_promotions").select("id,product_id,name,discount_type,discount_value,starts_at,ends_at,is_active,created_at")
      .in("product_id", pageIds).eq("is_active", true).throwOnError(),
    client.from("product_color_fields").select("product_id").in("product_id", pageIds).eq("enabled", true).throwOnError(),
    client.from("product_personalization_fields").select("product_id").in("product_id", pageIds).throwOnError(),
  ]);
  const activePromotions = ((promotions.data ?? []) as ProductPromotionRow[]).filter(row => isPromotionActive(row))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const byId = new Map((rows.data ?? []).map(row => [row.id, row]));
  const products = pageIds.flatMap(id => {
    const row = byId.get(id);
    if (!row) return [];
    return [{ ...toProduct({ ...row, description: null } as ProductRow,
      ((images.data ?? []) as ProductImageRow[]).filter(image => image.product_id === id),
      activePromotions.find(promotion => promotion.product_id === id)),
      hasColorOptions: colors.data?.some(item => item.product_id === id) ?? false,
      hasPersonalizationOptions: personalization.data?.some(item => item.product_id === id) ?? false,
    }];
  });
  return { products, nextOffset, total: ids.length };
}
