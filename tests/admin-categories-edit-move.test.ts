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

test("category management view uses CategoryRedirectingForm kinds for move/save", () => {
  const viewSource = readFileSync(
    path.join(root, "components/admin/category-management-view.tsx"),
    "utf8",
  );
  assert.match(viewSource, /const editingCategory = editCategoryId/);
  assert.match(viewSource, /id=\{`category-edit-\$\{editingCategory\.id\}`\}/);
  assert.doesNotMatch(viewSource, /<details\s+id=\{`category-edit-\$\{category\.id\}`\}/);
  assert.match(viewSource, /kind="move"/);
  assert.match(viewSource, /kind="update"/);
  assert.match(viewSource, /CategoryRedirectingForm/);
  assert.doesNotMatch(viewSource, /action=\{moveCategory\}/);
  assert.doesNotMatch(viewSource, /action=\{updateCategory\}/);
});

test("category create panel uses CategoryRedirectingForm create kind", () => {
  const panelSource = readFileSync(
    path.join(root, "components/admin/category-management-panel.tsx"),
    "utf8",
  );
  assert.match(panelSource, /CategoryRedirectingForm/);
  assert.match(panelSource, /kind="create"/);
});

test("category actions return href and skip admin revalidate on success", () => {
  const actionsSource = readFileSync(
    path.join(root, "app/admin/actions.ts"),
    "utf8",
  );
  assert.match(actionsSource, /function categoryActionHref/);
  assert.match(
    actionsSource,
    /createCategory\(formData: FormData\): Promise<\{ href: string \}>/,
  );
  assert.match(
    actionsSource,
    /updateCategory\(formData: FormData\): Promise<\{ href: string \}>/,
  );
  assert.match(
    actionsSource,
    /moveCategory\(formData: FormData\): Promise<\{ href: string \}>/,
  );
  assert.match(
    actionsSource,
    /revalidateCategoryPaths\(\{ includeAdmin: false \}\)/,
  );
  assert.match(
    actionsSource,
    /return categoryActionHref\(\s*"success",\s*"Позицията е променена\."/,
  );
  assert.match(
    actionsSource,
    /return categoryActionHref\(\s*"success",\s*"Категорията е обновена\."/,
  );
});

test("admin page passes editCategory into CategoryManagementPanel", () => {
  const pageSource = readFileSync(path.join(root, "app/admin/page.tsx"), "utf8");
  assert.match(pageSource, /editCategoryId=\{firstValue\(params\.editCategory\)/);
  assert.match(pageSource, /loadAdminCategoriesData/);
});

test("CategoryRedirectingForm hard-assigns href and imports actions", () => {
  const formSource = readFileSync(
    path.join(root, "components/admin/category-redirecting-form.tsx"),
    "utf8",
  );
  assert.match(formSource, /"use client"/);
  assert.match(formSource, /window\.location\.assign\(result\.href\)/);
  assert.match(formSource, /from "@\/app\/admin\/actions"/);
  assert.match(formSource, /createCategory/);
  assert.match(formSource, /updateCategory/);
  assert.match(formSource, /moveCategory/);
  assert.doesNotMatch(formSource, /router\.push/);
});
