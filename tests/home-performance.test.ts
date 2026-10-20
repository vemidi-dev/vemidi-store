import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET } from "@/app/api/home-products/route";
import { getHomeProductPage, getHomeFeaturedPosts } from "@/lib/home/repository";
import { orderedHomeProductIds, parseHomeProductOffset } from "@/lib/home/products";

test("home ordering preserves featured-first ordering, publication filtering, ties and deduplication", () => {
  const rows = [
    { id: "c", catalog_sort_order: 0, created_at: "2026-01-01" },
    { id: "a", catalog_sort_order: 10, created_at: "2026-01-01" },
    { id: "b", catalog_sort_order: 0, created_at: "2026-02-01" },
  ];
  assert.deepEqual(orderedHomeProductIds(rows, [{ product_id: "c" }, { product_id: "hidden" }, { product_id: "c" }]), ["c", "a", "b"]);
  assert.deepEqual(orderedHomeProductIds(rows, []), ["a", "b", "c"]);
});

test("home page offsets are bounded to eight-product pages", () => {
  assert.equal(parseHomeProductOffset(null), 0);
  assert.equal(parseHomeProductOffset("8"), 8);
  assert.equal(parseHomeProductOffset("10000"), 10000);
  for (const value of ["-8", "1", "08", "8.0", "8x", "10008", "", "Infinity"]) assert.equal(parseHomeProductOffset(value), null);
});

test("home repository fetches only one card page with anonymous tagged caching and time-valid promotions", async t => {
  const oldFetch = globalThis.fetch;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://home-test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anonymous-test-key";
  const calls: URL[] = [];
  t.after(() => {
    globalThis.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = oldKey;
  });
  const rows = Array.from({ length: 18 }, (_, index) => ({ id: `p${index}`, catalog_sort_order: index + 1, created_at: "2026-01-01" }));
  globalThis.fetch = (async (input, init) => {
    const url = new URL(String(input));
    calls.push(url);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer anonymous-test-key");
    assert.equal(new Headers(init?.headers).get("cookie"), null);
    assert.deepEqual((init as RequestInit & { next: unknown }).next, { revalidate: 60, tags: ["home-public-v1"] });
    const table = url.pathname.split("/").at(-1);
    const ids = (url.searchParams.get("id") ?? url.searchParams.get("product_id"))?.slice(4, -1).split(",").map(id => id.replaceAll('"', ""));
    let data: unknown[] = [];
    if (table === "products") {
      assert.equal(url.searchParams.get("status"), "eq.published");
      assert.equal(url.searchParams.get("visibility"), "eq.public");
      assert.ok(!url.searchParams.get("select")!.includes("description"));
      data = ids ? rows.filter(row => ids.includes(row.id)).map(row => ({ ...row, slug: row.id, product_code: row.id, name: row.id, price: 20, image_url: "https://example.com/fallback.webp", is_customizable: false, is_sold_out: false, fulfillment_type: "stocked", stock_quantity: row.id === "p0" ? 0 : 5 })) : rows;
    }
    if (table === "home_featured_products") data = [{ product_id: "p10" }, { product_id: "missing" }];
    if (table === "product_images") data = [{ id: "i1", product_id: "p10", image_url: "https://example.com/secondary.webp", sort_order: 0, is_primary: false }, { id: "i2", product_id: "p10", image_url: "https://example.com/primary.webp", sort_order: 5, is_primary: true }];
    if (table === "product_promotions") data = [
      { id: "expired", product_id: "p10", is_active: true, starts_at: "2010-01-01", ends_at: "2020-01-01", created_at: "2026-01-01", discount_type: "percentage", discount_value: 50 },
      { id: "active", product_id: "p10", name: "Promo", is_active: true, starts_at: "2010-01-01", ends_at: "2999-01-01", created_at: "2025-01-01", discount_type: "percentage", discount_value: 10 },
    ];
    if (table === "product_color_fields") data = [{ product_id: "p10" }];
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  const page = await getHomeProductPage();
  assert.equal(page.total, 18);
  assert.equal(page.products.length, 8);
  assert.equal(page.nextOffset, 8);
  assert.deepEqual(page.products.map(row => row.id), ["p10", "p0", "p1", "p2", "p3", "p4", "p5", "p6"]);
  assert.equal(page.products[0].price, 18);
  assert.equal(page.products[0].hasColorOptions, true);
  assert.equal(page.products[0].images[0].src, "https://example.com/primary.webp");
  assert.equal(page.products[1].orderable, false);
  assert.equal(page.products[0].description, "");
  assert.equal(calls.length, 7);
  for (const url of calls.filter(url => url.searchParams.has("product_id"))) assert.equal(url.searchParams.get("product_id")!.slice(4, -1).split(",").length, 8);
  const next = await getHomeProductPage(8);
  assert.equal(next.products.length, 8);
  assert.ok(next.products.every(product => !page.products.some(first => first.id === product.id)));
  const last = await getHomeProductPage(16);
  assert.equal(last.products.length, 2);
  assert.equal(last.nextOffset, 18);
  const empty = await getHomeProductPage(24);
  assert.equal(empty.products.length, 0);
  assert.equal(empty.nextOffset, 18);
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get("is_featured"), "eq.true");
    assert.equal(url.searchParams.get("is_published"), "eq.true");
    assert.equal(url.searchParams.get("limit"), "3");
    assert.ok(!url.searchParams.get("select")!.includes("content"));
    return new Response("[]", { headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  assert.deepEqual(await getHomeFeaturedPosts(), []);
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } })) as typeof fetch;
  assert.equal((await GET(new Request("https://example.com/api/home-products?offset=8"))).status, 503);
  assert.equal((await GET(new Request("https://example.com/api/home-products?offset=-1"))).status, 400);
});

test("home streams lower sections without waiting for a full catalog and invalidates public cache after edits", () => {
  const page = readFileSync("app/page.tsx", "utf8");
  assert.doesNotMatch(page, /getStorefrontCatalog|getPublishedBlogPosts/);
  assert.match(page, /<Suspense fallback=\{<HomeSectionFallback \/>\}><HomeCatalogContent/);
  assert.match(page, /<Suspense fallback=\{<HomeSectionFallback \/>\}><HomeEditorialContent/);
  assert.match(page, /getPublishedEvents\(\)/);
  const revalidate = readFileSync("lib/home/revalidate.ts", "utf8");
  assert.match(revalidate, /revalidateTag\(HOME_PUBLIC_CACHE_TAG\)/);
  for (const path of ["app/admin/actions.ts", "app/admin/site-content-actions.ts", "app/admin/site-media-actions.ts", "app/admin/content-actions.ts", "app/admin/promotion-actions.ts", "app/admin/color-actions.ts", "app/admin/material-actions.ts", "app/admin/product-import-actions.ts", "app/admin/product-import/route.ts", "lib/faq/revalidate.ts"]) assert.match(readFileSync(path, "utf8"), /revalidateHomePublicData\(\)/);
  const client = readFileSync("components/home/home-featured-products.tsx", "utf8");
  assert.match(client, /\/api\/home-products\?offset=/);
  assert.match(client, /if \(busy\.current\) return/);
  assert.match(client, /disabled=\{pending\}/);
  assert.match(client, /role="alert"/);
});
