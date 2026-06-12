import assert from "node:assert/strict";
import test from "node:test";

import {
  appendProductSlugSuffix,
  applyBackfillSlugs,
  isHistoricalSlugConflict,
  shouldRedirectHistoricalSlug,
  slugifyProductName,
  suggestDuplicateProductSlug,
  uniquifyProductSlug,
  validateProductSlug,
  PRODUCT_SLUG_MAX_LENGTH,
} from "@/lib/product-slug";
import {
  buildCanonicalProductRedirectPath,
  getProductPath,
} from "@/lib/product-url";
import { isUuid } from "@/lib/is-uuid";
import { makeCartLineId } from "@/lib/cart-line-id";
import {
  getLegacyProductOrderCode,
  getOrderItemProductCode,
  getOrderItemProductPath,
  parseStoreOrderItems,
  type OrderRow,
} from "@/lib/admin/orders";

test("bulgarian transliteration for product slug", () => {
  assert.equal(
    slugifyProductName('Творчески комплект „Вълшебни пеперуди“'),
    "tvorcheski-komplekt-valshebni-peperudi",
  );
});

test("slugify removes special symbols and collapses hyphens", () => {
  assert.equal(
    slugifyProductName("  Подарък!!!   за--бебе  "),
    "podarak-za-bebe",
  );
});

test("slug validation rejects uuid-shaped values", () => {
  const result = validateProductSlug("11111111-1111-4111-8111-111111111111");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "uuid");
  }
});

test("uniquifyProductSlug appends numeric suffixes", () => {
  const taken = new Set(["tvorcheski-komplekt", "tvorcheski-komplekt-2"]);
  assert.equal(
    uniquifyProductSlug("tvorcheski-komplekt", taken),
    "tvorcheski-komplekt-3",
  );
});

test("duplicate slug suggestion keeps -copy suffix", () => {
  assert.equal(
    suggestDuplicateProductSlug("tvorcheski-komplekt"),
    "tvorcheski-komplekt-copy",
  );
});

test("product path helpers use seo slug", () => {
  assert.equal(
    getProductPath("tvorcheski-komplekt"),
    "/products/tvorcheski-komplekt",
  );
});

test("redirect path keeps allowed campaign query params only", () => {
  const path = buildCanonicalProductRedirectPath("nov-slug", {
    campaign: "spring",
    source: "landing",
    landing: "https://example.com/promo",
    price: "19.99",
    token: "secret",
  });
  assert.match(path, /^\/products\/nov-slug\?/);
  assert.match(path, /campaign=spring/);
  assert.match(path, /source=landing/);
  assert.match(path, /landing=https/);
  assert.doesNotMatch(path, /price=/);
  assert.doesNotMatch(path, /token=/);
});

test("cart line identity stays on product uuid", () => {
  const productId = "11111111-1111-4111-8111-111111111111";
  const slug = "tvorcheski-komplekt";
  const byId = makeCartLineId(productId);
  const bySlug = makeCartLineId(slug);
  assert.notEqual(byId, bySlug);
  assert.match(byId, new RegExp(`^${productId}::`));
});

test("order snapshot helpers prefer product code and slug", () => {
  const item = {
    productId: "11111111-1111-4111-8111-111111111111",
    productCode: "VM-000123",
    productSlug: "tvorcheski-komplekt",
    name: "Продукт",
    unitPrice: 10,
    quantity: 1,
    lineTotal: 10,
    personalization: null,
    personalizationFields: [],
    selectedColors: [],
    optionSelections: [],
  };
  assert.equal(getOrderItemProductCode(item), "VM-000123");
  assert.equal(
    getOrderItemProductPath(item),
    "/products/tvorcheski-komplekt",
  );
});

test("legacy orders without productCode fall back to uuid code", () => {
  const order: OrderRow = {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    created_at: null,
    status: "new",
    product_name: null,
    kit_name: null,
    kit_size: null,
    coloring: null,
    personalization: null,
    child_name: null,
    total_price: 10,
    currency: "EUR",
    customer_name: "Test",
    customer_phone: "0888000000",
    customer_email: null,
    courier: null,
    delivery_type: null,
    city: null,
    delivery_details: null,
    office_id: null,
    office_name: null,
    office_address: null,
    payment_method: null,
    note: null,
    raw_payload: {
      order: {
        items: [
          {
            productId: "11111111-1111-4111-8111-111111111111",
            name: "Стар продукт",
            quantity: 1,
            unitPrice: 10,
          },
        ],
      },
    },
  };

  const [item] = parseStoreOrderItems(order);
  assert.ok(item);
  assert.equal(
    getOrderItemProductCode(item),
    getLegacyProductOrderCode("11111111-1111-4111-8111-111111111111"),
  );
  assert.equal(getOrderItemProductPath(item), null);
});

test("uuid detector matches canonical product ids", () => {
  assert.equal(isUuid("11111111-1111-4111-8111-111111111111"), true);
  assert.equal(isUuid("tvorcheski-komplekt"), false);
});

test("empty or symbol-only names fall back to product slug base", () => {
  assert.equal(slugifyProductName(""), "");
  assert.equal(slugifyProductName("!!!"), "");
  assert.equal(uniquifyProductSlug("", new Set()), "product");
});

test("slugify enforces maximum length", () => {
  const longName = "а".repeat(200);
  const slug = slugifyProductName(longName);
  assert.ok(slug.length <= PRODUCT_SLUG_MAX_LENGTH);
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("uniquifyProductSlug handles many products with the same base name", () => {
  const taken = new Set<string>();
  const base = slugifyProductName("Подарък");
  taken.add(base);
  for (let suffix = 2; suffix <= 9999; suffix += 1) {
    taken.add(`${base}-${suffix}`);
  }

  const next = uniquifyProductSlug(base, taken);
  assert.ok(next.length <= PRODUCT_SLUG_MAX_LENGTH);
  assert.notEqual(next, base);
  assert.ok(!taken.has(next));
});

test("historical slug conflict is detected for a different product", () => {
  assert.equal(
    isHistoricalSlugConflict("star-slug", "product-b", [
      { slug: "star-slug", productId: "product-a" },
    ]),
    true,
  );
  assert.equal(
    isHistoricalSlugConflict("star-slug", "product-a", [
      { slug: "star-slug", productId: "product-a" },
    ]),
    false,
  );
});

test("redirect loop prevention skips self-target redirects", () => {
  assert.equal(shouldRedirectHistoricalSlug("nov-slug", "nov-slug"), false);
  assert.equal(shouldRedirectHistoricalSlug("star-slug", "nov-slug"), true);
  assert.equal(shouldRedirectHistoricalSlug("star-slug", null), false);
});

test("appendProductSlugSuffix keeps full suffix for 80-char bases", () => {
  const base = "a".repeat(PRODUCT_SLUG_MAX_LENGTH);
  const withTwo = appendProductSlugSuffix(base, 2);
  const withTen = appendProductSlugSuffix(base, 10);
  const withLong = appendProductSlugSuffix(base, 9999);

  assert.equal(withTwo.length, PRODUCT_SLUG_MAX_LENGTH);
  assert.equal(withTen.length, PRODUCT_SLUG_MAX_LENGTH);
  assert.equal(withLong.length, PRODUCT_SLUG_MAX_LENGTH);
  assert.ok(withTwo.endsWith("-2"));
  assert.ok(withTen.endsWith("-10"));
  assert.ok(withLong.endsWith("-9999"));
  assert.notEqual(withTwo, withTen);
  assert.notEqual(withTen, withLong);
});

test("two identical 80-char slug bases receive distinct suffixed candidates", () => {
  const base = "b".repeat(PRODUCT_SLUG_MAX_LENGTH);
  const taken = new Set([base]);
  const second = uniquifyProductSlug(base, taken);
  const third = uniquifyProductSlug(base, new Set([base, second]));

  assert.ok(second.endsWith("-2"));
  assert.ok(third.endsWith("-3"));
  assert.equal(second.length, PRODUCT_SLUG_MAX_LENGTH);
  assert.equal(third.length, PRODUCT_SLUG_MAX_LENGTH);
});

test("re-running slug backfill preserves existing slug assignments", () => {
  const products = [
    { id: "product-1", name: "Подарък" },
    { id: "product-2", name: "Подарък" },
  ];
  const firstPass = applyBackfillSlugs(products);
  const secondPass = applyBackfillSlugs(products, firstPass);

  assert.deepEqual([...firstPass.entries()], [...secondPass.entries()]);
  assert.equal(firstPass.get("product-1"), "podarak");
  assert.equal(firstPass.get("product-2"), "podarak-2");
});
