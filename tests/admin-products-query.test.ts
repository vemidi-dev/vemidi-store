import assert from "node:assert/strict";
import test from "node:test";

import {
  PRODUCT_PAGE_SIZE_DEFAULT,
  PRODUCT_PAGE_SIZE_MAX,
  makeAdminProductsHref,
  parseProductsQuery,
  sanitizeProductSearchTerm,
} from "@/lib/admin/products-query";

test("parseProductsQuery defaults page and page_size", () => {
  const query = parseProductsQuery({});
  assert.equal(query.page, 1);
  assert.equal(query.pageSize, PRODUCT_PAGE_SIZE_DEFAULT);
  assert.equal(query.search, "");
  assert.equal(query.categoryId, "");
  assert.equal(query.status, "");
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

test("parseProductsQuery accepts valid category uuid and status", () => {
  const category = "11111111-1111-4111-8111-111111111111";
  const query = parseProductsQuery({
    category,
    status: "draft",
    page: "3",
    pageSize: "10",
  });
  assert.equal(query.categoryId, category);
  assert.equal(query.status, "draft");
  assert.equal(query.page, 3);
  assert.equal(query.pageSize, 10);
});

test("parseProductsQuery ignores invalid status", () => {
  const query = parseProductsQuery({ status: "hidden" });
  assert.equal(query.status, "");
});

test("sanitizeProductSearchTerm strips PostgREST wildcards", () => {
  assert.equal(sanitizeProductSearchTerm("a%b_c,d"), "a b c d");
});

test("makeAdminProductsHref always sets tab=products and preserves filters", () => {
  const href = makeAdminProductsHref(
    { page: 2 },
    {
      search: "чаша",
      categoryId: "11111111-1111-4111-8111-111111111111",
      status: "published",
      page: 1,
      pageSize: 50,
    },
  );
  assert.match(href, /tab=products/);
  assert.match(href, /q=%D1%87%D0%B0%D1%88%D0%B0/);
  assert.match(href, /category=11111111-1111-4111-8111-111111111111/);
  assert.match(href, /status=published/);
  assert.match(href, /page=2/);
  assert.match(href, /page_size=50/);
  assert.doesNotMatch(href, /editProduct=/);
});

test("makeAdminProductsHref omits default page_size and page=1", () => {
  const href = makeAdminProductsHref({}, {
    search: "",
    categoryId: "",
    status: "",
    page: 1,
    pageSize: PRODUCT_PAGE_SIZE_DEFAULT,
  });
  assert.equal(href, "/admin?tab=products");
});

test("makeAdminProductsHref can set editProduct", () => {
  const href = makeAdminProductsHref(
    { editProduct: "prod-1", page: 1 },
    { search: "x", categoryId: "", status: "", page: 4, pageSize: 30 },
  );
  assert.match(href, /editProduct=prod-1/);
  assert.match(href, /q=x/);
  assert.doesNotMatch(href, /page=/);
});
