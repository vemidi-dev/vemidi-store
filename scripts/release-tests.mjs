import { spawnSync } from "node:child_process";

const unitOnly = process.argv.includes("--unit-only");

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const tsxCmd = process.platform === "win32" ? "tsx.cmd" : "tsx";

const releaseTestGroups = [
  {
    label: "Workshop registration & event editing",
    files: [
      "tests/event-admin.test.ts",
      "tests/event-datetime.test.ts",
      "tests/event-form-extensions.test.ts",
      "tests/event-materials-pricing.test.ts",
      "tests/event-participant-management.test.ts",
      "tests/event-admin-workspace.test.ts",
      "tests/event-gallery-compression.test.ts",
      "tests/event-phone-map.test.ts",
      "tests/event-social-links.test.ts",
      "tests/event-calendar.test.ts",
      "tests/event-cover-layout.test.ts",
      "tests/event-photo-gallery.test.ts",
      "tests/past-events-pagination.test.ts",
      "tests/event-registration-email.test.ts",
      "tests/event-registration-forms.test.ts",
      "tests/event-registrations.test.ts",
      "tests/event-schema.test.ts",
      "tests/blog-rich-text.test.ts",
    ],
  },
  {
    label: "Pricing, cart & quantity tiers",
    files: [
      "tests/cart-quantity-price-tiers.test.ts",
      "tests/product-prepared-variants.test.ts",
      "tests/cart-storage.test.ts",
      "tests/cart-line-summary.test.ts",
      "tests/cart-upsell-quantity-sync.test.ts",
      "tests/cart-upsell-remove.test.ts",
      "tests/product-options.test.ts",
      "tests/product-personalization.test.ts",
    ],
  },
  {
    label: "Product page UX & copy",
    files: [
      "tests/home-performance.test.ts",
      "tests/home-hero-layout.test.ts",
      "tests/home-featured-blog-posts.test.ts",
      "tests/product-page-ux-regression.test.ts",
      "tests/product-page-copy.test.ts",
      "tests/product-page-content.test.ts",
      "tests/product-wish-template-regression.test.ts",
    ],
  },
  {
    label: "Admin merchandising & category filters",
    files: [
      "tests/admin-category-groups-and-product-settings.test.ts",
      "tests/admin-form-data.test.ts",
      "tests/promotion-admin.test.ts",
    ],
  },
  {
    label: "Admin & product lifecycle",
    files: [
      "tests/product-create-local-draft.test.ts",
      "tests/product-save-form.test.ts",
      "tests/product-wish-templates.test.ts",
      "tests/product-publish-validation.test.ts",
      "tests/product-json-import-v2-select.test.ts",
      "tests/product-publication.test.ts",
      "tests/product-preview.test.ts",
    ],
  },
  {
    label: "Checkout & orders",
    files: [
      "tests/checkout-edge-cases.test.ts",
      "tests/checkout-personalization-restore.test.ts",
      "tests/customer-photos.test.ts",
      "tests/order-confirmation.test.ts",
      "tests/order-item-display.test.ts",
    ],
  },
  {
    label: "Consent & analytics",
    files: [
      "tests/google-consent-mode.test.ts",
      "tests/meta-pixel.test.ts",
      "tests/google-analytics-purchase.test.ts",
    ],
  },
  {
    label: "Data audit (unit)",
    files: [
      "tests/data-audit-report.test.ts",
      "tests/category-related-audit.test.ts",
    ],
  },
  {
    label: "Related categories",
    files: [
      "tests/category-related-categories.test.ts",
      "tests/category-related-selector.test.ts",
      "tests/category-related-storefront.test.ts",
    ],
  },
  {
    label: "SEO & routes",
    files: [
      "tests/info-page-metadata.test.ts",
      "tests/robots-config.test.ts",
      "tests/canonical-produkti-route.test.ts",
      "tests/seo-editor-mvp.test.ts",
      "tests/google-merchant-feed.test.ts",
    ],
  },
];

function runStep(label, command, args) {
  console.log(`\n=== ${label} ===\n`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(`\n${label} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if ((result.status ?? 1) !== 0) {
    console.error(`\n${label} failed.`);
    process.exit(result.status ?? 1);
  }

  console.log(`\n${label} passed.`);
}

console.log("VeMiDi Crafts release test suite");
console.log(
  unitOnly
    ? "Mode: unit tests only"
    : "Mode: typecheck + targeted unit/regression tests (no full build)",
);

if (!unitOnly) {
  runStep("Typecheck", npmCmd, ["run", "typecheck"]);
}

for (const group of releaseTestGroups) {
  runStep(group.label, tsxCmd, ["--test", ...group.files]);
}

console.log("\nRelease test suite passed.");
console.log("Pre-production command: npm run test:release");
