import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBackfillProductCodes,
  assignBackfillProductCodes,
  evaluateProductCodeAccess,
  formatProductCode,
  nextProductCodeAfterSequenceState,
  parseProductCodeNumber,
  resolveProductCodeSequenceState,
} from "@/lib/product-code";

test("formatProductCode renders VM-000001 for sequence value 1", () => {
  assert.equal(formatProductCode(1), "VM-000001");
});

test("empty catalog sequence state yields VM-000001 as next code", () => {
  const state = resolveProductCodeSequenceState([]);
  assert.deepEqual(state, { setvalValue: 1, isCalled: false });
  assert.equal(nextProductCodeAfterSequenceState(state), "VM-000001");
});

test("single existing product sequence state yields VM-000002 as next code", () => {
  const state = resolveProductCodeSequenceState(["VM-000001"]);
  assert.deepEqual(state, { setvalValue: 1, isCalled: true });
  assert.equal(nextProductCodeAfterSequenceState(state), "VM-000002");
});

test("backfill assigns deterministic codes by created_at then id", () => {
  const assignments = assignBackfillProductCodes([
    { id: "b", createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "a", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "c", createdAt: "2026-01-02T00:00:00.000Z" },
  ]);

  assert.equal(assignments.get("a"), "VM-000001");
  assert.equal(assignments.get("b"), "VM-000002");
  assert.equal(assignments.get("c"), "VM-000003");
});

test("re-running backfill logic keeps existing code assignments stable", () => {
  const products = [
    { id: "product-1", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "product-2", createdAt: "2026-01-02T00:00:00.000Z" },
  ];

  const firstRun = assignBackfillProductCodes(products);
  const secondRun = assignBackfillProductCodes(products);
  assert.deepEqual([...firstRun.entries()], [...secondRun.entries()]);
});

test("sequence state uses max existing VM code after partial migration", () => {
  const state = resolveProductCodeSequenceState([
    "VM-000001",
    "VM-000010",
    "legacy-code",
  ]);
  assert.deepEqual(state, { setvalValue: 10, isCalled: true });
  assert.equal(nextProductCodeAfterSequenceState(state), "VM-000011");
});

test("parseProductCodeNumber rejects malformed values", () => {
  assert.equal(parseProductCodeNumber("VM-1"), null);
  assert.equal(parseProductCodeNumber("VM-000001"), 1);
});

test("backfill re-run keeps manually assigned product codes", () => {
  const products = [
    { id: "product-1", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "product-2", createdAt: "2026-01-02T00:00:00.000Z" },
  ];
  const firstRun = applyBackfillProductCodes(products);
  const secondRun = applyBackfillProductCodes(products, firstRun);

  assert.deepEqual([...firstRun.entries()], [...secondRun.entries()]);
  assert.equal(secondRun.get("product-1"), "VM-000001");
  assert.equal(secondRun.get("product-2"), "VM-000002");
});

test("admin create and duplicate callers can allocate the next product code", () => {
  assert.deepEqual(
    evaluateProductCodeAccess({ role: "authenticated", isAdmin: true }),
    { allowed: true },
  );
});

test("non-admin authenticated users cannot allocate product codes directly", () => {
  assert.deepEqual(
    evaluateProductCodeAccess({ role: "authenticated", isAdmin: false }),
    { allowed: false, reason: "admin_required" },
  );
});

test("anonymous users cannot execute next_product_code", () => {
  assert.deepEqual(
    evaluateProductCodeAccess({ role: "anon", isAdmin: false }),
    { allowed: false, reason: "missing_execute_grant" },
  );
});

test("re-running product code backfill preserves manually assigned codes", () => {
  const products = [
    { id: "product-1", createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "product-2", createdAt: "2026-01-02T00:00:00.000Z" },
  ];
  const firstPass = applyBackfillProductCodes(products);
  const preserved = new Map<string, string>([
    ["product-1", firstPass.get("product-1")!],
    ["product-2", "VM-009999"],
  ]);
  const secondPass = applyBackfillProductCodes(products, preserved);

  assert.equal(secondPass.get("product-1"), "VM-000001");
  assert.equal(secondPass.get("product-2"), "VM-009999");
  assert.deepEqual(
    [...secondPass.entries()],
    [...applyBackfillProductCodes(products, preserved).entries()],
  );
});
