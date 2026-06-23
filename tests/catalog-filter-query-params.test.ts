import assert from "node:assert/strict";
import test from "node:test";

import {
  CATALOG_OCCASION_FILTER_PARAM,
  CATALOG_PRODUCT_CATEGORY_FILTER_PARAM,
  normalizeCatalogFilterSearchParams,
  readCatalogOccasionFilterValue,
  readCatalogProductCategoryFilterValue,
} from "@/lib/catalog-filter-query-params";
import { BUTTERFLY_PRODUCT_ID } from "@/tests/fixtures/butterfly-conservative-handoff";

function params(input: Record<string, string>): URLSearchParams {
  return new URLSearchParams(input);
}

test("readCatalogOccasionFilterValue prefers povod over occasion", () => {
  assert.equal(
    readCatalogOccasionFilterValue({ povod: "krashtene", occasion: "svatba" }),
    "krashtene",
  );
  assert.equal(readCatalogOccasionFilterValue({ occasion: "svatba" }), "svatba");
});

test("readCatalogProductCategoryFilterValue prefers vid over product", () => {
  assert.equal(
    readCatalogProductCategoryFilterValue({
      vid: "plikove-za-pari",
      product: "kutii",
    }),
    "plikove-za-pari",
  );
  assert.equal(
    readCatalogProductCategoryFilterValue({ product: "kutii" }),
    "kutii",
  );
});

test("normalizeCatalogFilterSearchParams renames legacy occasion and product filters", () => {
  assert.deepEqual(
    normalizeCatalogFilterSearchParams(params({ occasion: "krashtene" })),
    params({ povod: "krashtene" }),
  );
  assert.deepEqual(
    normalizeCatalogFilterSearchParams(params({ product: "plikove-za-pari" })),
    params({ vid: "plikove-za-pari" }),
  );
  assert.deepEqual(
    normalizeCatalogFilterSearchParams(
      params({ product: "plik-za-pari", sort: "featured" }),
    ),
    params({ vid: "plikove-za-pari", sort: "featured" }),
  );
});

test("normalizeCatalogFilterSearchParams keeps campaign product UUID untouched", () => {
  assert.equal(
    normalizeCatalogFilterSearchParams(
      params({ product: BUTTERFLY_PRODUCT_ID }),
    ),
    null,
  );
});

test("normalizeCatalogFilterSearchParams is a no-op for canonical public params", () => {
  assert.equal(
    normalizeCatalogFilterSearchParams(
      params({
        [CATALOG_OCCASION_FILTER_PARAM]: "krashtene",
        [CATALOG_PRODUCT_CATEGORY_FILTER_PARAM]: "plikove-za-pari",
      }),
    ),
    null,
  );
});
