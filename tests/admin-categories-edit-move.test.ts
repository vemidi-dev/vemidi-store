import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { makeAdminCategoriesHref } from "@/lib/admin/categories-href";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("makeAdminCategoriesHref editCategory link for Редакция button", () => {
  const href = makeAdminCategoriesHref({
    categoryType: "product",
    editCategory: "cat-123",
  });
  assert.match(href, /tab=categories/);
  assert.match(href, /categoryType=product/);
  assert.match(href, /editCategory=cat-123/);
  assert.doesNotMatch(href, /_refresh=/);
});

test("makeAdminCategoriesHref close edit omits editCategory", () => {
  const href = makeAdminCategoriesHref({ categoryType: "material" });
  assert.match(href, /tab=categories/);
  assert.match(href, /categoryType=material/);
  assert.doesNotMatch(href, /editCategory=/);
});

test("makeAdminCategoriesHref move/save success includes tab and success", () => {
  const href = makeAdminCategoriesHref({
    categoryType: "occasion",
    success: "Позицията е променена.",
    refresh: true,
  });
  assert.match(href, /tab=categories/);
  assert.match(href, /categoryType=occasion/);
  assert.match(href, /success=/);
  assert.match(href, /_refresh=/);
});

test("category management view wires editCategory open and Редакция href", () => {
  const viewSource = readFileSync(
    path.join(root, "components/admin/category-management-view.tsx"),
    "utf8",
  );
  assert.match(viewSource, /editCategoryId === category\.id \? true : undefined/);
  assert.match(viewSource, /makeAdminCategoriesHref\(\{\s*categoryType: category\.category_type,\s*editCategory: category\.id,/);
  assert.match(viewSource, /Затвори редакцията/);
  assert.match(
    viewSource,
    /makeAdminCategoriesHref\(\{\s*categoryType: activeTab\s*\}\)/,
  );
  assert.match(viewSource, /action=\{moveCategory\}/);
  assert.doesNotMatch(viewSource, /CategoryRedirectingForm/);
});

test("category actions redirect to categories success href", () => {
  const actionsSource = readFileSync(
    path.join(root, "app/admin/actions.ts"),
    "utf8",
  );
  assert.match(actionsSource, /function redirectToCategories/);
  assert.match(
    actionsSource,
    /redirectToCategories\(\s*"success",\s*"Позицията е променена\."/,
  );
  assert.match(
    actionsSource,
    /redirectToCategories\(\s*"success",\s*"Категорията е обновена\."/,
  );
  assert.doesNotMatch(actionsSource, /categoryActionHref/);
  assert.doesNotMatch(actionsSource, /Promise<\{ href: string \}>/);
});

test("admin page passes editCategory into CategoryManagementPanel", () => {
  const pageSource = readFileSync(path.join(root, "app/admin/page.tsx"), "utf8");
  assert.match(pageSource, /editCategoryId=\{firstValue\(params\.editCategory\)/);
  assert.match(pageSource, /loadAdminCategoriesData/);
});
