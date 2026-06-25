import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/product_page_content_sections.sql", "utf8");

function getDuplicateFunctionSql() {
  const duplicateStart = sql.indexOf(
    "create or replace function public.admin_duplicate_product",
  );
  assert.ok(duplicateStart >= 0, "admin_duplicate_product migration body is missing");
  return sql.slice(duplicateStart);
}

test("product page content migration duplicate copies quantity color fields", () => {
  const duplicateSql = getDuplicateFunctionSql();

  assert.match(
    duplicateSql,
    /insert into public\.product_color_fields \([\s\S]*selection_mode[\s\S]*required_total_quantity/,
  );
  assert.match(duplicateSql, /v_color_field\.selection_mode/);
  assert.match(duplicateSql, /v_color_field\.required_total_quantity/);
  assert.match(duplicateSql, /coalesce\(v_color_field\.selection_mode, 'choice'\)/);
});

test("product page content migration duplicate copies Phase 2 product content columns", () => {
  const duplicateSql = getDuplicateFunctionSql();

  assert.match(
    duplicateSql,
    /insert into public\.products \([\s\S]*personalization_info[\s\S]*dimensions_materials[\s\S]*ordering_info/,
  );
  assert.match(duplicateSql, /v_source\.personalization_info/);
  assert.match(duplicateSql, /v_source\.dimensions_materials/);
  assert.match(duplicateSql, /v_source\.ordering_info/);
});

test("product page content migration duplicate keeps primary category and subtitle copy", () => {
  const duplicateSql = getDuplicateFunctionSql();

  assert.match(duplicateSql, /v_source\.subtitle/);
  assert.match(duplicateSql, /v_source\.primary_category_id/);
});

test("product page content migration duplicate intentionally skips SEO overrides", () => {
  const duplicateSql = getDuplicateFunctionSql();

  assert.doesNotMatch(duplicateSql, /meta_title/);
  assert.doesNotMatch(duplicateSql, /meta_description/);
  assert.doesNotMatch(duplicateSql, /og_title/);
  assert.doesNotMatch(duplicateSql, /og_description/);
});

test("product page content migration is wrapped in a transaction", () => {
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
});
