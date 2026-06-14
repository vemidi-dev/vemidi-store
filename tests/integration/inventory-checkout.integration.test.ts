import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  assertInventoryMigrationReady,
  createSupabaseTestClient,
  getIntegrationSkipReason,
} from "@/tests/integration/supabase-test-client";

type TestProductInput = {
  fulfillmentType: "made_to_order" | "stocked" | "unavailable";
  stockQuantity?: number | null;
  isSoldOut?: boolean;
};

type CleanupState = {
  productIds: string[];
  orderIds: string[];
  idempotencyKeys: string[];
};

const skipReason = getIntegrationSkipReason();

function checkoutPayload(productId: string, quantity: number, idempotencyKey = randomUUID()) {
  return {
    p_customer: {
      name: "Integration Test",
      phone: "0888123456",
      email: "integration@example.com",
    },
    p_delivery: {
      courier: "econt",
      type: "office",
      city: "София",
      officeOrPostcode: "Тестов офис 1",
    },
    p_items: [{ productId, quantity }],
    p_note: null,
    p_idempotency_key: idempotencyKey,
  };
}

async function createTestProduct(
  supabase: ReturnType<typeof createSupabaseTestClient>,
  input: TestProductInput,
) {
  const suffix = randomUUID().slice(0, 8);
  const productCode = `VM-9${suffix.replace(/\D/g, "").padEnd(5, "0").slice(0, 5)}`;
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: `Inventory test ${suffix}`,
      description: "Integration test product",
      price: 12.5,
      slug: `inv-test-${suffix}`,
      product_code: productCode,
      fulfillment_type: input.fulfillmentType,
      stock_quantity:
        input.fulfillmentType === "stocked" ? (input.stockQuantity ?? 0) : null,
      is_sold_out: input.isSoldOut ?? false,
      is_customizable: false,
    })
    .select("id, stock_quantity, fulfillment_type")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function readStock(
  supabase: ReturnType<typeof createSupabaseTestClient>,
  productId: string,
) {
  const { data, error } = await supabase
    .from("products")
    .select("stock_quantity, fulfillment_type, is_sold_out")
    .eq("id", productId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function placeOrder(
  supabase: ReturnType<typeof createSupabaseTestClient>,
  productId: string,
  quantity: number,
  idempotencyKey = randomUUID(),
) {
  return supabase.rpc("create_store_order", checkoutPayload(productId, quantity, idempotencyKey));
}

async function cleanup(
  supabase: ReturnType<typeof createSupabaseTestClient>,
  state: CleanupState,
) {
  if (state.idempotencyKeys.length) {
    await supabase
      .from("store_order_requests")
      .delete()
      .in("idempotency_key", state.idempotencyKeys);
  }

  if (state.orderIds.length) {
    await supabase.from("orders").delete().in("id", state.orderIds);
  }

  if (state.productIds.length) {
    await supabase.from("products").delete().in("id", state.productIds);
  }
}

function rpcErrorCode(error: { message?: string } | null) {
  return error?.message ?? "";
}

test("inventory checkout integration suite", { skip: skipReason || undefined }, async (t) => {
  const supabase = createSupabaseTestClient();
  await assertInventoryMigrationReady(supabase);

  await t.test("made_to_order never changes stock_quantity", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "made_to_order",
      });
      cleanupState.productIds.push(product.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);
      const { data, error } = await placeOrder(supabase, product.id, 1, idempotencyKey);
      assert.equal(error, null);
      assert.ok(data);
      cleanupState.orderIds.push(String(data));

      const after = await readStock(supabase, product.id);
      assert.equal(after.stock_quantity, null);
      assert.equal(after.fulfillment_type, "made_to_order");
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("stocked order decrements stock atomically", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 3,
      });
      cleanupState.productIds.push(product.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);
      const { data, error } = await placeOrder(supabase, product.id, 2, idempotencyKey);
      assert.equal(error, null);
      cleanupState.orderIds.push(String(data));

      const after = await readStock(supabase, product.id);
      assert.equal(after.stock_quantity, 1);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("multiple cart lines aggregate demand for one stocked product", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 3,
      });
      cleanupState.productIds.push(product.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);
      const { data, error } = await supabase.rpc("create_store_order", {
        ...checkoutPayload(product.id, 1, idempotencyKey),
        p_items: [
          { productId: product.id, quantity: 1 },
          { productId: product.id, quantity: 2 },
        ],
      });

      assert.equal(error, null);
      cleanupState.orderIds.push(String(data));

      const after = await readStock(supabase, product.id);
      assert.equal(after.stock_quantity, 0);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("insufficient stock rejects the whole order and leaves stock unchanged", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 1,
      });
      cleanupState.productIds.push(product.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);
      const { error } = await placeOrder(supabase, product.id, 2, idempotencyKey);
      assert.ok(error);
      assert.match(rpcErrorCode(error), /insufficient_stock/);

      const after = await readStock(supabase, product.id);
      assert.equal(after.stock_quantity, 1);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("mixed cart fails when any stocked line is insufficient", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const madeToOrder = await createTestProduct(supabase, {
        fulfillmentType: "made_to_order",
      });
      const stocked = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 1,
      });
      cleanupState.productIds.push(madeToOrder.id, stocked.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);
      const { error } = await supabase.rpc("create_store_order", {
        ...checkoutPayload(madeToOrder.id, 1, idempotencyKey),
        p_items: [
          { productId: madeToOrder.id, quantity: 1 },
          { productId: stocked.id, quantity: 2 },
        ],
      });

      assert.ok(error);
      assert.match(rpcErrorCode(error), /insufficient_stock/);

      const stockedAfter = await readStock(supabase, stocked.id);
      assert.equal(stockedAfter.stock_quantity, 1);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("unavailable and is_sold_out block checkout", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const unavailable = await createTestProduct(supabase, {
        fulfillmentType: "unavailable",
      });
      const soldOut = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 5,
        isSoldOut: true,
      });
      cleanupState.productIds.push(unavailable.id, soldOut.id);

      const unavailableKey = randomUUID();
      cleanupState.idempotencyKeys.push(unavailableKey);
      const unavailableResult = await placeOrder(
        supabase,
        unavailable.id,
        1,
        unavailableKey,
      );
      assert.ok(unavailableResult.error);
      assert.match(rpcErrorCode(unavailableResult.error), /product_unavailable/);

      const soldOutKey = randomUUID();
      cleanupState.idempotencyKeys.push(soldOutKey);
      const soldOutResult = await placeOrder(supabase, soldOut.id, 1, soldOutKey);
      assert.ok(soldOutResult.error);
      assert.match(rpcErrorCode(soldOutResult.error), /product_sold_out/);

      const stockedAfter = await readStock(supabase, soldOut.id);
      assert.equal(stockedAfter.stock_quantity, 5);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("is_sold_out takes priority over stocked availability", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 0,
        isSoldOut: true,
      });
      cleanupState.productIds.push(product.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);
      const { error } = await placeOrder(supabase, product.id, 1, idempotencyKey);
      assert.ok(error);
      assert.match(rpcErrorCode(error), /product_sold_out/);
      assert.doesNotMatch(rpcErrorCode(error), /insufficient_stock/);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("idempotent retry returns the same order without double decrement", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 2,
      });
      cleanupState.productIds.push(product.id);

      const idempotencyKey = randomUUID();
      cleanupState.idempotencyKeys.push(idempotencyKey);

      const first = await placeOrder(supabase, product.id, 1, idempotencyKey);
      assert.equal(first.error, null);
      cleanupState.orderIds.push(String(first.data));

      const second = await placeOrder(supabase, product.id, 1, idempotencyKey);
      assert.equal(second.error, null);
      assert.equal(second.data, first.data);

      const after = await readStock(supabase, product.id);
      assert.equal(after.stock_quantity, 1);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });

  await t.test("only one concurrent order succeeds for the last stocked unit", async () => {
    const cleanupState: CleanupState = { productIds: [], orderIds: [], idempotencyKeys: [] };

    try {
      const product = await createTestProduct(supabase, {
        fulfillmentType: "stocked",
        stockQuantity: 1,
      });
      cleanupState.productIds.push(product.id);

      const firstKey = randomUUID();
      const secondKey = randomUUID();
      cleanupState.idempotencyKeys.push(firstKey, secondKey);

      const [first, second] = await Promise.all([
        placeOrder(supabase, product.id, 1, firstKey),
        placeOrder(supabase, product.id, 1, secondKey),
      ]);

      const outcomes = [first, second];
      const successes = outcomes.filter((result) => !result.error);
      const failures = outcomes.filter((result) => result.error);

      assert.equal(successes.length, 1);
      assert.equal(failures.length, 1);
      assert.match(rpcErrorCode(failures[0]?.error ?? null), /insufficient_stock/);
      cleanupState.orderIds.push(String(successes[0]?.data));

      const after = await readStock(supabase, product.id);
      assert.equal(after.stock_quantity, 0);
    } finally {
      await cleanup(supabase, cleanupState);
    }
  });
});
