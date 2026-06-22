import assert from "node:assert/strict";
import test from "node:test";

import { plainTextClassName, withPlainTextClass } from "@/lib/plain-text";

test("plainTextClassName preserves line breaks and wraps long text", () => {
  assert.match(plainTextClassName, /whitespace-pre-line/);
  assert.match(plainTextClassName, /break-words/);
});

test("withPlainTextClass merges custom classes", () => {
  assert.equal(
    withPlainTextClass("mt-4 text-boutique-muted"),
    "whitespace-pre-line break-words mt-4 text-boutique-muted",
  );
  assert.equal(withPlainTextClass(), plainTextClassName);
});
