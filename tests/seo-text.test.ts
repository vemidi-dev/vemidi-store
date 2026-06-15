import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSeoPlainText,
  truncateSeoDescription,
} from "@/lib/seo/seo-text";

test("normalizeSeoPlainText collapses real and literal line breaks", () => {
  assert.equal(
    normalizeSeoPlainText("Ред 1\r\nРед 2\\r\\nРед 3\\nРед 4"),
    "Ред 1 Ред 2 Ред 3 Ред 4",
  );
});

test("normalizeSeoPlainText strips HTML and decodes entities", () => {
  assert.equal(
    normalizeSeoPlainText(
      "<p>Дървен <strong>плик</strong>&nbsp;за&nbsp;пари &amp; подарък</p>",
    ),
    "Дървен плик за пари & подарък",
  );
});

test("normalizeSeoPlainText handles unicode spaces and numeric entities", () => {
  assert.equal(
    normalizeSeoPlainText("Срок\u00A0от\u202F5\u201310\u00A0дни"),
    "Срок от 5–10 дни",
  );
  assert.equal(
    normalizeSeoPlainText("Цена&#160;24&#x20AC;"),
    "Цена 24€",
  );
});

test("normalizeSeoPlainText preserves bulgarian punctuation and quotes", () => {
  assert.equal(
    normalizeSeoPlainText("„Плик за пари“ — ръчна изработка."),
    "„Плик за пари“ — ръчна изработка.",
  );
});

test("normalizeSeoPlainText returns empty for whitespace-only input", () => {
  assert.equal(normalizeSeoPlainText("   \r\n  \t  "), "");
  assert.equal(normalizeSeoPlainText(null), "");
});

test("truncateSeoDescription avoids cutting words mid-way", () => {
  const text =
    "Дървен плик за пари с персонален надпис и избор на цвят за сватба и кръщене, ръчно изработен от VeMiDi crafts с внимание към детайла и качеството.";

  const truncated = truncateSeoDescription(text, 80);
  assert.ok(truncated.length <= 80);
  assert.ok(!truncated.endsWith(" "));
  assert.ok(!truncated.includes("\r"));
  assert.ok(!truncated.includes("\n"));
  assert.ok(!/\s$/.test(truncated));
});

test("truncateSeoDescription keeps a single very long token when no boundary exists", () => {
  const longWord = "а".repeat(200);
  const truncated = truncateSeoDescription(longWord, 80);
  assert.equal(truncated.length, 80);
  assert.equal(truncated, "а".repeat(80));
});

test("truncateSeoDescription returns empty for blank normalized input", () => {
  assert.equal(truncateSeoDescription("   \\r\\n   "), "");
});
