import assert from "node:assert/strict";
import test from "node:test";

import { parseBlogRichText } from "@/lib/content/blog-rich-text";

test("blog rich text parser supports safe blocks and inline formatting", () => {
  const blocks = parseBlogRichText(
    [
      "## Заглавие",
      "",
      "**важен** и *нежен* текст с {color:accent}акцент{/color}",
      "",
      "- първа точка",
      "- [продукти](/produkti)",
    ].join("\n"),
  );

  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[0], {
    type: "heading",
    level: 2,
    children: [{ type: "text", value: "Заглавие" }],
  });
  assert.equal(blocks[1]?.type, "paragraph");
  assert.equal(blocks[2]?.type, "list");
});

test("blog rich text parser leaves unsafe links as text", () => {
  const blocks = parseBlogRichText("[опасен](javascript:alert(1))");

  assert.equal(blocks[0]?.type, "paragraph");
  assert.equal(
    blocks[0]?.children.some((token) => token.type === "link"),
    false,
  );
});
