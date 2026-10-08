import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("checkout coupon preview uses fetch endpoint so form state is not remounted", () => {
  const panelSource = readFileSync(
    path.join(root, "components/checkout/checkout-panel.tsx"),
    "utf8",
  );
  const routeSource = readFileSync(
    path.join(root, "app/checkout/coupon-preview/route.ts"),
    "utf8",
  );

  assert.doesNotMatch(panelSource, /@\/app\/checkout\/coupon-actions/);
  assert.match(panelSource, /fetch\("\/checkout\/coupon-preview"/);
  assert.match(panelSource, /items: lines\.map/);
  assert.match(panelSource, /productId: line\.productId/);
  assert.match(panelSource, /lineTotal: line\.price \* line\.quantity/);
  assert.match(routeSource, /previewDiscountCouponForCheckout/);
  assert.match(routeSource, /NextResponse\.json/);
});

test("coupon lookup keeps preview and order case-insensitive", () => {
  const previewSource = readFileSync(
    path.join(root, "lib/checkout/coupon-preview.ts"),
    "utf8",
  );
  const migrationSource = readFileSync(
    path.join(root, "supabase/product_promo_code_eligible.sql"),
    "utf8",
  );

  assert.match(previewSource, /\.ilike\("code", code\)/);
  assert.match(migrationSource, /where upper\(code\) = v_coupon_code/);
});

test("coupon preview resolves product eligibility on the server", () => {
  const previewSource = readFileSync(
    path.join(root, "lib/checkout/coupon-preview.ts"),
    "utf8",
  );

  assert.match(previewSource, /\.from\("products"\)/);
  assert.match(previewSource, /\.select\("id,promo_code_eligible"\)/);
  assert.match(previewSource, /\.in\("id", productIds\)/);
  assert.match(previewSource, /eligibleSubtotal = previewItems\.reduce/);
});
