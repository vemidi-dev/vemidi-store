import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { customerPhotoId, isUsableCustomerPhoto, personalizationDisplayValue, type CustomerPhotoRow } from "@/lib/customer-photos/reference";
import { processCustomerPhoto } from "@/lib/customer-photos/process-image";
import { verifyCheckoutCustomerPhotos } from "@/lib/customer-photos/checkout";
import { validatePersonalizationFields, type PersonalizationFieldDefinition } from "@/lib/checkout-personalization";
import { buildStoreOrderItemDetailLines } from "@/lib/admin/order-item-display";
import { parseStoredCart } from "@/lib/cart-storage";
import { resolveCartLineSummaryRows } from "@/lib/cart/cart-line-summary";
import { makeCartLineId } from "@/lib/cart-line-id";
import { cleanupAbandonedCustomerPhotos } from "@/lib/customer-photos/cleanup";

const id = "11111111-1111-4111-8111-111111111111";
const fieldId = "22222222-2222-4222-8222-222222222222";
const productId = "33333333-3333-4333-8333-333333333333";
const ref = `upload:${id}`;
const definition: PersonalizationFieldDefinition = { id: fieldId, product_id: productId, label: "Снимка", field_key: "photo", field_type: "file", max_length: 100, is_required: true };
const value = { fieldId, fieldKey: "photo", label: "Снимка", value: ref };
const photo: CustomerPhotoRow = { id, field_id: fieldId, product_id: productId, owner_hash: "owner", storage_path: `owner/${id}.png`, original_filename: "photo.png", expires_at: "2099-01-01T00:00:00Z", order_id: null };

test("photo references cannot be URLs, storage paths or malformed identifiers", () => {
  assert.equal(customerPhotoId(ref), id);
  for (const input of ["upload:../../secret", "https://example.com/photo.png", "javascript:alert(1)", "upload:bad", null]) assert.equal(customerPhotoId(input), null);
  assert.equal(personalizationDisplayValue(ref), "Качена снимка");
  assert.equal(personalizationDisplayValue("Maria"), "Maria");
});

test("checkout requires file references and preserves the immutable ID but not a private URL", () => {
  assert.deepEqual(validatePersonalizationFields([], [definition]), { ok: false, code: "required_personalization_missing" });
  assert.equal(validatePersonalizationFields([{ ...value, value: "https://evil.test/image" }], [definition]).ok, false);
  const result = validatePersonalizationFields([value], [definition]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.fields[0]?.value, ref);
  assert.equal(result.summary, "Снимка: Качена снимка");
  assert.equal(validatePersonalizationFields([], [{ ...definition, is_required: false }]).ok, true);
});

test("owner, product, field, expiration and presence are all required", () => {
  assert.equal(isUsableCustomerPhoto(photo, "owner", productId, fieldId), true);
  assert.equal(isUsableCustomerPhoto(photo, "another-owner", productId, fieldId), false);
  assert.equal(isUsableCustomerPhoto(photo, "owner", id, fieldId), false);
  assert.equal(isUsableCustomerPhoto(photo, "owner", productId, id), false);
  assert.equal(isUsableCustomerPhoto({ ...photo, expires_at: "2000-01-01" }, "owner", productId, fieldId), false);
  assert.equal(isUsableCustomerPhoto(null, "owner", productId, fieldId), false);
});

test("server checkout verifies uploaded files rather than trusting forged cart references", async () => {
  function client(rows: CustomerPhotoRow[], error: unknown = null) {
    return { from: () => ({ select: () => ({ in: async () => ({ data: rows, error }) }) }) } as unknown as SupabaseClient;
  }
  assert.equal(await verifyCheckoutCustomerPhotos(client([photo]), "owner", productId, [definition], [value]), true);
  assert.equal(await verifyCheckoutCustomerPhotos(client([photo]), null, productId, [definition], [value]), false);
  assert.equal(await verifyCheckoutCustomerPhotos(client([photo]), "other", productId, [definition], [value]), false);
  assert.equal(await verifyCheckoutCustomerPhotos(client([]), "owner", productId, [definition], [value]), false);
  assert.equal(await verifyCheckoutCustomerPhotos(client([photo], { message: "failed" }), "owner", productId, [definition], [value]), false);
  assert.equal(await verifyCheckoutCustomerPhotos(client([]), null, productId, [], []), true);
});

test("JPEG and PNG keep dimensions, strip metadata and reject disguised or oversized files", async () => {
  for (const format of ["png", "jpeg"] as const) {
    const input = await sharp({ create: { width: 180, height: 120, channels: 3, background: "red" } }).withMetadata()[format]().toBuffer();
    const result = await processCustomerPhoto(input);
    const meta = await sharp(result.data).metadata();
    assert.equal(meta.width, 180); assert.equal(meta.height, 120); assert.equal(meta.exif, undefined);
    assert.equal(result.contentType, format === "png" ? "image/png" : "image/jpeg");
  }
  for (const input of [Buffer.from("<svg><script>alert(1)</script></svg>"), Buffer.from("not a photo"), Buffer.alloc(4 * 1024 * 1024 + 1), Buffer.from([255, 216, 255, 0])]) {
    await assert.rejects(() => processCustomerPhoto(input));
  }
});

test("cart persists upload IDs and separates products with different customer photos", () => {
  const line = { productId, slug: "photo-product", title: "Photo product", price: 4.5, quantity: 1, personalizationFields: [value] };
  const parsed = parseStoredCart(JSON.stringify([line]));
  assert.equal(parsed[0]?.personalizationFields?.[0]?.value, ref);
  assert.ok(resolveCartLineSummaryRows(parsed[0]!).some(row => row.value === "Качена снимка"));
  assert.notEqual(makeCartLineId(productId, undefined, undefined, [value]), makeCartLineId(productId, undefined, undefined, [{ ...value, value: `upload:${fieldId}` }]));
});

test("admin order shows a private download reference rather than exposing raw storage URLs", () => {
  const lines = buildStoreOrderItemDetailLines({ personalization: null, personalizationFields: [value], selectedColors: [], optionSelections: [] });
  assert.deepEqual(lines, [{ text: "Снимка: Качена снимка", photoId: id }]);
  const route = readFileSync("app/api/customer-photos/[id]/route.ts", "utf8");
  assert.match(route, /checkIsAdmin/);
  assert.match(route, /owner === photo.owner_hash/);
  assert.match(route, /createSignedUrl\(photo.storage_path, 60/);
  assert.match(route, /private, no-store/);
  const migration = readFileSync("supabase/customer_product_photos.sql", "utf8");
  assert.match(migration, /'customer-photos', 'customer-photos', false/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public.customer_product_photos from public, anon, authenticated/);
  assert.match(migration, /after insert on public.orders/);
});

test("cleanup protects reused photos referenced by another surviving order and fails closed on lookup errors", async () => {
  for (const references of [{ count: 1, error: null }, { count: null, error: { message: "DB unavailable" } }]) {
    let removals = 0;
    const query = {
      is: () => query, lt: () => query, order: () => query,
      limit: async () => ({ data: [{ id, storage_path: photo.storage_path }], error: null }),
    };
    const client = {
      from: (table: string) => table === "orders"
        ? { select: () => ({ contains: async () => references }) }
        : { select: () => query },
      storage: { from: () => ({ remove: async () => { removals++; return { error: null }; } }) },
    } as unknown as SupabaseClient;
    if (references.error) await assert.rejects(() => cleanupAbandonedCustomerPhotos(client));
    else assert.equal(await cleanupAbandonedCustomerPhotos(client), 0);
    assert.equal(removals, 0);
  }
});
