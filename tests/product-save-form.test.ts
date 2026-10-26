import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ProductFormValidationError, runProductFormAction } from "../lib/admin/product-form-result";

test("product form validation returns an inline error without losing submitted values", async () => {
  const result = await runProductFormAction(async () => {
    throw new ProductFormValidationError("Липсва име на цветово поле.");
  });
  assert.deepEqual(result, { error: "Липсва име на цветово поле." });
});

test("successful redirects and unexpected failures are not swallowed by product validation", async () => {
  const redirect = Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;replace;/admin;303;" });
  await assert.rejects(runProductFormAction(async () => { throw redirect; }), (error) => error === redirect);
  const network = new Error("network");
  await assert.rejects(runProductFormAction(async () => { throw network; }), (error) => error === network);
});

test("create and edit use a non-resetting form and preserve server validation in place", () => {
  const actions = readFileSync("app/admin/actions.ts", "utf8");
  for (const [start, end] of [["async function createProductImpl", "export async function updateProduct"], ["async function updateProductImpl", "export async function publishProduct"]]) {
    const operation = actions.slice(actions.indexOf(start), actions.indexOf(end));
    assert.match(operation, /if \(inlineErrors\) throw new ProductFormValidationError\(message\)/);
    assert.match(operation, /if \(colorFieldsError\) \{\s*fail\(colorFieldsError\)/);
    assert.match(operation, /if \(optionGroupsError\) \{\s*fail\(optionGroupsError\)/);
  }
  const create = readFileSync("components/admin/product-create-panel.tsx", "utf8");
  const edit = readFileSync("components/admin/product-list-panel.tsx", "utf8");
  assert.match(create, /<ProductSaveForm[\s\S]*action=\{saveNewProductForm\}/);
  assert.match(edit, /<ProductSaveForm[\s\S]*action=\{saveExistingProductForm\}/);
  const form = readFileSync("components/admin/product-save-form.tsx", "utf8");
  assert.match(form, /event\.preventDefault\(\)/);
  assert.match(form, /new FormData\(form\)/);
  assert.doesNotMatch(form, /\.reset\(|useActionState/);
  assert.match(form, /fieldset disabled=\{pending\}/);
  assert.match(form, /admin-product-save-failed/);
});
