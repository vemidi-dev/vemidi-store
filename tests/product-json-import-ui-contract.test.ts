import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("products import view renders ProductJsonImportPanel without heavy product panels", () => {
  const pageSource = readFileSync(path.join(root, "app/admin/page.tsx"), "utf8");
  const importBranchStart = pageSource.indexOf('productsView === "import"');
  assert.ok(importBranchStart > 0);

  const importBranch = pageSource.slice(importBranchStart, importBranchStart + 600);
  assert.match(importBranch, /ProductJsonImportPanel/);
  assert.doesNotMatch(importBranch, /ProductCreatePanel/);
  assert.doesNotMatch(importBranch, /ProductListSlimPanel/);
  assert.doesNotMatch(importBranch, /loadAdminProductsPage/);
});

test("products list links to import view", () => {
  const slimPanelSource = readFileSync(
    path.join(root, "components/admin/product-list-slim-panel.tsx"),
    "utf8",
  );

  assert.match(slimPanelSource, /productsView=import/);
  assert.match(slimPanelSource, /Импорт от JSON/);
});

test("import panel uses validate and import server actions", () => {
  const panelSource = readFileSync(
    path.join(root, "components/admin/product-json-import-panel.tsx"),
    "utf8",
  );

  assert.match(panelSource, /validateProductJsonImport/);
  assert.match(panelSource, /importProductsFromJson/);
  assert.match(panelSource, /Импорт като чернови/);
  assert.match(panelSource, /disabled=\{!canImport\}/);
});

test("import summary edit links use admin editProduct contract", () => {
  const summarySource = readFileSync(
    path.join(root, "components/admin/product-json-import-summary.tsx"),
    "utf8",
  );
  const importServiceSource = readFileSync(
    path.join(root, "lib/admin/product-json-import-v2/import-service.ts"),
    "utf8",
  );

  assert.match(summarySource, /entry\.editUrl/);
  assert.match(importServiceSource, /editProduct=/);
  assert.match(importServiceSource, /tab=products/);
});

test("import panel links back to products list", () => {
  const panelSource = readFileSync(
    path.join(root, "components/admin/product-json-import-panel.tsx"),
    "utf8",
  );

  assert.match(panelSource, /makeAdminProductsHref/);
  assert.match(panelSource, /Обратно към продуктите/);
});
