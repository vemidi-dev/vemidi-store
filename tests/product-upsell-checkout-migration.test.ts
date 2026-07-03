import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/product_upsell_checkout.sql", "utf8");

test("product upsell checkout migration keeps server-side order pricing authoritative", () => {
  assert.match(sql, /create or replace function public\.create_store_order/);
  assert.match(sql, /set search_path = public/);
  assert.match(sql, /grant execute on function public\.create_store_order/);
  assert.match(sql, /v_unit_price := greatest\(0, v_upsell_offer\.special_price \+ v_option_delta\)/);
  assert.match(sql, /'upsell', v_upsell_snapshot/);
  assert.match(sql, /'lineTotal', v_unit_price \* v_quantity/);
});

test("product upsell checkout migration validates upsell-only products and offer context", () => {
  assert.match(sql, /coalesce\(v_product\.status, 'draft'\) <> 'published'/);
  assert.match(sql, /coalesce\(v_product\.visibility, 'public'\) = 'upsell_only'/);
  assert.match(sql, /upsell_only_product_requires_offer/);
  assert.match(sql, /from public\.product_upsell_offers offer/);
  assert.match(sql, /offer\.source_product_id = v_upsell_source_product_id/);
  assert.match(sql, /offer\.upsell_product_id = v_product_id/);
  assert.match(sql, /where demand\.product_id = offer\.source_product_id/);
  assert.match(sql, /invalid_upsell_quantity/);
});
