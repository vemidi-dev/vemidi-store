import assert from "node:assert/strict";
import test from "node:test";

import { WITHDRAWAL_PAGE_ROBOTS } from "@/lib/withdrawal/constants";

test("withdrawal page robots directive is noindex follow", () => {
  assert.deepEqual(WITHDRAWAL_PAGE_ROBOTS, { index: false, follow: true });
});
