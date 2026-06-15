import assert from "node:assert/strict";
import test from "node:test";

import {
  buildWithdrawalsListHref,
  parseWithdrawalsQuery,
} from "@/lib/admin/withdrawals";
import { isWithdrawalStatus } from "@/lib/withdrawal/validation";

test("parseWithdrawalsQuery normalizes pagination and status", () => {
  const query = parseWithdrawalsQuery({
    status: "reviewing",
    search: "WDR-2026",
    page: "2",
    pageSize: "50",
  });

  assert.equal(query.status, "reviewing");
  assert.equal(query.search, "WDR-2026");
  assert.equal(query.page, 2);
  assert.equal(query.pageSize, 50);
});

test("parseWithdrawalsQuery ignores invalid status", () => {
  const query = parseWithdrawalsQuery({ status: "refunded" });
  assert.equal(query.status, "");
});

test("buildWithdrawalsListHref preserves filters", () => {
  const href = buildWithdrawalsListHref({
    status: "new",
    search: "maria",
    page: 2,
    pageSize: 25,
  });
  assert.match(href, /tab=withdrawals/);
  assert.match(href, /status=new/);
  assert.match(href, /q=maria/);
  assert.match(href, /page=2/);
});

test("isWithdrawalStatus guards admin status updates", () => {
  assert.equal(isWithdrawalStatus("accepted"), true);
  assert.equal(isWithdrawalStatus("pending"), false);
});
