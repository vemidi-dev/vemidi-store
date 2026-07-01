import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { adminFormFields } from "@/lib/admin/form-fields";
import { buildProductCountByCategoryId } from "@/lib/admin/category-stats";
import { isChecked } from "@/lib/admin/form-data";
import { resolveShopCategoryRedirect } from "@/lib/seo/shop-route";
import { parseShopSearchParams } from "@/lib/seo/shop-route";
import type { StorefrontCategory } from "@/lib/storefront/types";

test("admin category form maps storefront visibility field", () => {
  assert.equal(adminFormFields.category.isVisible, "is_visible");

  const visibleForm = new FormData();
  visibleForm.set(adminFormFields.category.isVisible, "on");
  assert.equal(isChecked(visibleForm, adminFormFields.category.isVisible), true);

  const hiddenForm = new FormData();
  assert.equal(isChecked(hiddenForm, adminFormFields.category.isVisible), false);
});

test("buildProductCountByCategoryId aggregates assignments per category", () => {
  const counts = buildProductCountByCategoryId(
    new Map([
      ["p1", ["c1", "c2"]],
      ["p2", ["c1"]],
    ]),
  );

  assert.equal(counts.get("c1"), 2);
  assert.equal(counts.get("c2"), 1);
});

test("hidden category slug does not resolve shop redirect", () => {
  const categories: StorefrontCategory[] = [
    {
      id: "hidden",
      name: "Скрита",
      slug: "skrita",
      category_type: "product",
      parent_id: null,
      show_on_home: false,
      is_visible: false,
      home_sort_order: 1,
      card_description: null,
      createdAt: null,
    },
  ];
  const params = { product: "skrita" };
  const parsed = parseShopSearchParams(params);

  assert.equal(resolveShopCategoryRedirect(params, parsed, categories), null);
});

test("admin category actions force a fresh admin page after redirects", () => {
  const actionsSource = readFileSync(new URL("../app/admin/actions.ts", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../app/admin/page.tsx", import.meta.url), "utf8");

  assert.match(actionsSource, /params\.set\("_refresh", Date\.now\(\)\.toString\(\)\)/);
  assert.match(pageSource, /export const dynamic = "force-dynamic"/);
});
