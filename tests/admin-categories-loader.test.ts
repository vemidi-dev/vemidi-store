import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("categories admin tab uses light loader, not loadAdminData", () => {
  const pageSource = readFileSync(path.join(root, "app/admin/page.tsx"), "utf8");
  const categoriesLoader = readFileSync(
    path.join(root, "lib/admin/categories-data.ts"),
    "utf8",
  );

  assert.match(pageSource, /loadAdminCategoriesData/);
  assert.match(pageSource, /activeTab === "categories"/);
  assert.match(categoriesLoader, /from\("categories"\)/);
  assert.match(categoriesLoader, /from\("product_categories"\)/);
  assert.match(categoriesLoader, /from\("category_related_categories"\)/);
  assert.doesNotMatch(categoriesLoader, /product_option_groups/);
  assert.doesNotMatch(categoriesLoader, /product_images/);
  assert.doesNotMatch(categoriesLoader, /from\("products"\)/);

  // Categories branch must return before the products/ordering monolith path.
  const categoriesIdx = pageSource.indexOf('if (activeTab === "categories")');
  const productsIdx = pageSource.indexOf(
    'if (activeTab === "products" && productsView !== "ordering")',
  );
  const monolithIdx = pageSource.lastIndexOf("loadAdminData(supabase)");
  assert.ok(categoriesIdx > 0);
  assert.ok(productsIdx > categoriesIdx);
  assert.ok(monolithIdx > productsIdx);

  const categoriesBlock = pageSource.slice(categoriesIdx, productsIdx);
  assert.match(categoriesBlock, /loadAdminCategoriesData/);
  assert.doesNotMatch(categoriesBlock, /loadAdminData/);
});
