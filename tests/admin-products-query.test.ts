import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_PAGE_SIZE_DEFAULT,
  PRODUCT_PAGE_SIZE_MAX,
  getRequiredCategoryFilterIds,
  makeAdminProductsHref,
  parseProductsQuery,
  sanitizeProductSearchTerm,
} from "@/lib/admin/products-query";
import { makeAdminCategoriesHref } from "@/lib/admin/categories-href";

test("parseProductsQuery defaults page and page_size", () => {
  const query = parseProductsQuery({});
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, PRODUCT_PAGE_SIZE_DEFAULT);
  assert.equal(query.search, "");
  assert.equal(query.categoryId, "");
  assert.equal(query.productCategoryId, "");
  assert.equal(query.materialCategoryId, "");
  assert.equal(query.occasionCategoryId, "");
  assert.equal(query.availability, "");
  assert.equal(query.status, "");
  assert.equal(query.sort, "order-desc");
});

test("parseProductsQuery clamps page_size and page", () => {
  const query = parseProductsQuery({
    page: "0",
    pageSize: "999",
    status: "published",
    category: "not-a-uuid",
    q: "  vase  ",
  });
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, PRODUCT_PAGE_SIZE_MAX);
  assert.equal(query.status, "published");
  assert.equal(query.categoryId, "");
  assert.equal(query.search, "vase");
});

test("parseProductsQuery accepts typed category filters and availability", () => {
  const product = "11111111-1111-4111-8111-111111111111";
  const material = "22222222-2222-4222-8222-222222222222";
  const occasion = "33333333-3333-4333-8333-333333333333";
  const query = parseProductsQuery({
    productCat: product,
    materialCat: material,
    occasionCat: occasion,
    availability: "featured",
    status: "draft",
    sort: "price-asc",
    page: "3",
    pageSize: "10",
  });
  assert.equal(query.productCategoryId, product);
  assert.equal(query.materialCategoryId, material);
  assert.equal(query.occasionCategoryId, occasion);
  assert.equal(query.availability, "featured");
  assert.equal(query.status, "draft");
  assert.equal(query.sort, "price-asc");
  assert.equal(query.page, 3);
  assert.equal(query.pageSize, 10);
  assert.deepEqual(getRequiredCategoryFilterIds(query), [
    product,
    material,
    occasion,
  ]);
});

test("parseProductsQuery ignores invalid status and availability", () => {
  const query = parseProductsQuery({ status: "hidden", availability: "nope" });
  assert.equal(query.status, "");
  assert.equal(query.availability, "");
});

test("sanitizeProductSearchTerm strips PostgREST wildcards", () => {
  assert.equal(sanitizeProductSearchTerm("a%b_c,d"), "a b c d");
});

test("makeAdminProductsHref preserves typed filters", () => {
  const href = makeAdminProductsHref(
    { page: 2 },
    {
      search: "чаша",
      categoryId: "",
      productCategoryId: "11111111-1111-4111-8111-111111111111",
      materialCategoryId: "22222222-2222-4222-8222-222222222222",
      occasionCategoryId: "",
      availability: "active",
      status: "published",
      sort: "name-asc",
      page: 1,
      pageSize: 50,
    },
  );
  assert.match(href, /tab=products/);
  assert.match(href, /q=%D1%87%D0%B0%D1%88%D0%B0/);
  assert.match(href, /product_cat=11111111-1111-4111-8111-111111111111/);
  assert.match(href, /material_cat=22222222-2222-4222-8222-222222222222/);
  assert.match(href, /availability=active/);
  assert.match(href, /status=published/);
  assert.match(href, /sort=name-asc/);
  assert.match(href, /page=2/);
  assert.match(href, /page_size=50/);
  assert.doesNotMatch(href, /editProduct=/);
});

test("makeAdminProductsHref omits default page_size and page=1", () => {
  const href = makeAdminProductsHref({}, {
    search: "",
    categoryId: "",
    productCategoryId: "",
    materialCategoryId: "",
    occasionCategoryId: "",
    availability: "",
    status: "",
    sort: "order-desc",
    page: 1,
    pageSize: PRODUCT_PAGE_SIZE_DEFAULT,
  });
  assert.equal(href, "/admin?tab=products");
});

test("makeAdminProductsHref can set editProduct", () => {
  const href = makeAdminProductsHref(
    { editProduct: "prod-1", page: 1 },
    {
      search: "x",
      categoryId: "",
      productCategoryId: "",
      materialCategoryId: "",
      occasionCategoryId: "",
      availability: "",
      status: "",
      sort: "order-desc",
      page: 4,
      pageSize: 30,
    },
  );
  assert.match(href, /editProduct=prod-1/);
  assert.match(href, /q=x/);
  assert.doesNotMatch(href, /page=/);
});

test("makeAdminCategoriesHref keeps tab and optional editCategory", () => {
  const href = makeAdminCategoriesHref({
    categoryType: "product",
    editCategory: "cat-1",
  });
  assert.match(href, /tab=categories/);
  assert.match(href, /categoryType=product/);
  assert.match(href, /editCategory=cat-1/);
  assert.doesNotMatch(href, /_refresh=/);
});

test("makeAdminCategoriesHref adds refresh for success redirects", () => {
  const href = makeAdminCategoriesHref({
    categoryType: "occasion",
    success: "ok",
  });
  assert.match(href, /success=ok/);
  assert.match(href, /_refresh=/);
});
