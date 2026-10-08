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
