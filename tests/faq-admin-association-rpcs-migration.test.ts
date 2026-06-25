import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("supabase/faq_admin_association_rpcs.sql", "utf8");

function getFunctionSql(name: string) {
  const marker = `create or replace function public.${name}`;
  const start = sql.indexOf(marker);
  assert.ok(start >= 0, `${name} migration body is missing`);
  const nextFunction = sql.indexOf("create or replace function public.", start + marker.length);
  return nextFunction >= 0 ? sql.slice(start, nextFunction) : sql.slice(start);
}

test("faq association RPC migration is wrapped in a transaction", () => {
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
});

test("replace_product_faq_associations validates before deleting product links", () => {
  const body = getFunctionSql("replace_product_faq_associations");

  assert.match(body, /perform public\.assert_admin\(\)/);
  assert.match(body, /invalid_product_faq_group/);
  assert.match(body, /g\.scope = 'product'/);
  assert.match(body, /g\.is_active = true/);

  const validationIndex = body.indexOf("invalid_product_faq_group");
  const deleteGroupsIndex = body.indexOf("delete from public.product_faq_groups");
  const deleteItemsIndex = body.indexOf("delete from public.product_faq_items");
  const insertGroupsIndex = body.indexOf("insert into public.product_faq_groups");
  const insertItemsIndex = body.indexOf("insert into public.product_faq_items");

  assert.ok(validationIndex >= 0);
  assert.ok(deleteGroupsIndex > validationIndex);
  assert.ok(deleteItemsIndex > validationIndex);
  assert.ok(insertGroupsIndex > deleteGroupsIndex);
  assert.ok(insertItemsIndex > deleteItemsIndex);
  assert.match(body, /\(selected\.ordinality - 1\) \* 10/);
});

test("replace_faq_group_items validates before deleting group links", () => {
  const body = getFunctionSql("replace_faq_group_items");

  assert.match(body, /perform public\.assert_admin\(\)/);
  assert.match(body, /invalid_faq_group/);
  assert.match(body, /invalid_faq_item/);

  const validationIndex = body.indexOf("invalid_faq_item");
  const deleteIndex = body.indexOf("delete from public.faq_group_items");
  const insertIndex = body.indexOf("insert into public.faq_group_items");

  assert.ok(validationIndex >= 0);
  assert.ok(deleteIndex > validationIndex);
  assert.ok(insertIndex > deleteIndex);
});

test("faq association RPC migration revokes public and grants authenticated only", () => {
  assert.match(sql, /revoke all on function public\.replace_product_faq_associations/);
  assert.match(sql, /revoke all on function public\.replace_faq_group_items/);
  assert.match(sql, /grant execute on function public\.replace_product_faq_associations[\s\S]* to authenticated;/);
  assert.match(sql, /grant execute on function public\.replace_faq_group_items[\s\S]* to authenticated;/);
  assert.doesNotMatch(sql, /grant execute on function public\.replace_product_faq_associations[\s\S]* to anon;/);
});

test("faq association RPC functions set search_path to public", () => {
  assert.match(getFunctionSql("replace_product_faq_associations"), /set search_path = public/);
  assert.match(getFunctionSql("replace_faq_group_items"), /set search_path = public/);
});
