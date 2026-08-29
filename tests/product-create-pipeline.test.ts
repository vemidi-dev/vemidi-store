import assert from "node:assert/strict";
import test from "node:test";

import {
  attachProductGalleryImages,
  createProductDraftWithGallery,
} from "@/lib/admin/product-create-pipeline";
import type { ProductMutationInput } from "@/lib/admin/product-rpc";
import { createMockProductImportSupabase } from "./helpers/mock-product-import-supabase";

const baseMutationInput: ProductMutationInput = {
  name: "Demo",
  slug: "demo-product",
  subtitle: null,
  headingSubtitle: null,
  description: "Description",
  additionalInfo: null,
  personalizationInfo: null,
  dimensionsMaterials: null,
  orderingInfo: null,
  fulfillmentNote: null,
  price: 10,
  imageUrl: null,
  isCustomizable: false,
  isSoldOut: false,
  fulfillmentType: "made_to_order",
  stockQuantity: null,
  cardBadge: null,
  categoryIds: ["cat-1"],
  primaryCategoryId: "cat-1",
  colorFields: [],
  personalizationFields: [],
  wishTemplateIds: [],
  optionGroups: [],
  metaTitle: null,
  metaDescription: null,
  ogTitle: null,
  ogDescription: null,
};

test("createProductDraftWithGallery creates draft without images", async () => {
  const supabase = createMockProductImportSupabase({
    createProductId: "product-123",
  });

  const result = await createProductDraftWithGallery(supabase, {
    mutationInput: baseMutationInput,
    postCreate: {
      visibility: "public",
      showQuantitySelector: false,
      quantityPriceTiers: [],
      personalizationOpenByDefault: null,
    },
    imageFiles: [],
    imageAltTexts: [],
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }
  assert.equal(result.productId, "product-123");
  assert.equal(result.imageCount, 0);
});

test("createProductDraftWithGallery returns create stage error", async () => {
  const supabase = createMockProductImportSupabase({
    createErrorMessage: "slug_taken",
  });

  const result = await createProductDraftWithGallery(supabase, {
    mutationInput: baseMutationInput,
    postCreate: {
      visibility: "public",
      showQuantitySelector: false,
      quantityPriceTiers: [],
      personalizationOpenByDefault: null,
    },
    imageFiles: [],
    imageAltTexts: [],
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.stage, "create");
});

test("attachProductGalleryImages returns rpc error", async () => {
  const supabase = createMockProductImportSupabase({
    attachErrorMessage: "admin_attach_product_images missing",
  });

  const error = await attachProductGalleryImages(
    supabase,
    "product-123",
    [
      {
        path: "products/product-123/a.webp",
        url: "https://example.com/a.webp",
        imageId: "img-1",
        originalSize: 1,
        optimizedSize: 1,
      },
    ],
    ["Alt"],
  );

  assert.ok(error);
  assert.match(error.message, /admin_attach_product_images/);
});

test("createProductDraftWithGallery returns status stage error", async () => {
  const supabase = createMockProductImportSupabase({
    createProductId: "product-123",
    updateError: true,
  });

  const result = await createProductDraftWithGallery(supabase, {
    mutationInput: baseMutationInput,
    postCreate: {
      visibility: "public",
      showQuantitySelector: false,
      quantityPriceTiers: [],
      personalizationOpenByDefault: null,
    },
    imageFiles: [],
    imageAltTexts: [],
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.stage, "status");
  assert.equal(result.productId, "product-123");
});
