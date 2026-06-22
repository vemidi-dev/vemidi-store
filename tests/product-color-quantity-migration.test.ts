import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/product_color_quantity_mode.sql", "utf8");

test("product color quantity migration keeps inventory checkout hardening", () => {
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
  assert.match(sql, /create temporary table _order_demand/);
  assert.match(sql, /for update;/i);
  assert.match(sql, /set stock_quantity = product\.stock_quantity - demand\.quantity/);
  assert.match(sql, /'productCode', v_product\.product_code/);
  assert.match(sql, /'productSlug', v_product\.slug/);
  assert.match(sql, /'fulfillmentType', v_product\.fulfillment_type/);
  assert.match(sql, /'stockQuantityBefore', v_stock_before/);
  assert.match(sql, /'stockQuantityAfter', v_stock_after/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /grant execute on function public\.create_store_order/);
});

test("product color quantity migration adds quantity validation without dropping choice mode", () => {
  assert.match(sql, /validate_product_color_selections_for_order/);
  assert.match(sql, /perform public\.validate_product_color_selections_for_order/);
  assert.match(sql, /v_color_quantity/);
  assert.match(sql, /'quantity', v_color_quantity/);
  assert.match(sql, /selection_mode = 'quantity'/);
  assert.match(sql, /count\(distinct selected ->> 'optionId'\)/);
});
