import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  formatBlogInlineImageMarkdown,
  isAllowedBlogImageUrl,
  parseBlogRichText,
} from "@/lib/content/blog-rich-text";

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

test("blog rich text parser handles headings and ordered lists without blank lines", () => {
  const blocks = parseBlogRichText(
    [
      "## Какво да подарим за кръщене?",
      "Кръщенето е специален момент.",
      "1. *Паричен подарък, поднесен по красив начин*",
      "2. **Персонализиран спомен**",
    ].join("\n"),
  );

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0]?.type, "heading");
  assert.equal(blocks[1]?.type, "paragraph");
  assert.deepEqual(blocks[2], {
    type: "list",
    ordered: true,
    items: [
      [{ type: "italic", children: [{ type: "text", value: "Паричен подарък, поднесен по красив начин" }] }],
      [{ type: "bold", children: [{ type: "text", value: "Персонализиран спомен" }] }],
    ],
  });
});

test("blog rich text parser leaves unsafe links as text", () => {
  const blocks = parseBlogRichText("[опасен](javascript:alert(1))");

  assert.equal(blocks[0]?.type, "paragraph");
  assert.equal(
    blocks[0]?.children.some((token) => token.type === "link"),
    false,
  );
});

test("blog rich text can contain image blocks with src and alt", () => {
  const markdown = formatBlogInlineImageMarkdown(
    "Дървена кошничка",
    "https://cdn.example.com/storage/v1/object/public/product-images/blog/inline.webp",
  );

  const blocks = parseBlogRichText(
    ["Първи абзац", "", markdown, "", "Втори абзац"].join("\n"),
  );

  assert.equal(blocks.length, 3);
  assert.equal(blocks[0]?.type, "paragraph");
  assert.deepEqual(blocks[1], {
    type: "image",
    src: "https://cdn.example.com/storage/v1/object/public/product-images/blog/inline.webp",
    alt: "Дървена кошничка",
  });
  assert.equal(blocks[2]?.type, "paragraph");
});

test("blog image markdown round-trips through parse/save/load shape", () => {
  const src =
    "https://project.supabase.co/storage/v1/object/public/product-images/blog/post/img.webp";
  const stored = [
    "## Секция",
    "",
    formatBlogInlineImageMarkdown("Alt текст", src),
    "",
    "Текст след снимката",
    "",
    formatBlogInlineImageMarkdown("", src),
  ].join("\n");

  const blocks = parseBlogRichText(stored);
  const images = blocks.filter((block) => block.type === "image");

  assert.equal(images.length, 2);
  assert.equal(images[0]?.type, "image");
  if (images[0]?.type === "image") {
    assert.equal(images[0].src, src);
    assert.equal(images[0].alt, "Alt текст");
  }
  assert.equal(images[1]?.type, "image");
  if (images[1]?.type === "image") {
    assert.equal(images[1].alt, "");
  }

  // Re-parsing the same stored content keeps images (save/load stability).
  assert.deepEqual(parseBlogRichText(stored), blocks);
});

test("blog image parser rejects unsafe image urls", () => {
  assert.equal(isAllowedBlogImageUrl("javascript:alert(1)"), false);
  assert.equal(isAllowedBlogImageUrl("data:image/png;base64,abc"), false);
  assert.equal(isAllowedBlogImageUrl("//evil.example/x.png"), false);
  assert.equal(isAllowedBlogImageUrl("https://cdn.example.com/a.webp"), true);
  assert.equal(isAllowedBlogImageUrl("/images/local.webp"), true);

  const blocks = parseBlogRichText("![хак](javascript:alert(1))");
  assert.equal(blocks[0]?.type, "paragraph");
  assert.equal(
    blocks.some((block) => block.type === "image"),
    false,
  );
});

test("legacy blog content without images remains valid", () => {
  const blocks = parseBlogRichText(
    ["## Стара статия", "", "Само текст без снимки.", "", "- точка едно"].join(
      "\n",
    ),
  );

  assert.equal(blocks.length, 3);
  assert.equal(
    blocks.some((block) => block.type === "image"),
    false,
  );
  assert.equal(blocks[0]?.type, "heading");
  assert.equal(blocks[1]?.type, "paragraph");
  assert.equal(blocks[2]?.type, "list");
});

test("blog editor wires inline image upload control and reuse of image pipeline", () => {
  const editor = readFileSync(
    new URL("../components/admin/blog-rich-text-editor.tsx", import.meta.url),
    "utf8",
  );
  const action = readFileSync(
    new URL("../app/admin/blog-inline-image-actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(editor, /Добави снимка/);
  assert.match(editor, /uploadBlogInlineImage/);
  assert.match(editor, /formatBlogInlineImageMarkdown/);
  assert.match(action, /processAndUploadImages/);
  assert.match(action, /"blog"/);
  assert.match(action, /BLOG_INLINE_SCOPE_ID/);
});

test("blog inline images render centered and constrained", () => {
  const renderer = readFileSync(
    new URL("../lib/content/blog-rich-text.tsx", import.meta.url),
    "utf8",
  );

  assert.match(renderer, /mx-auto my-2 max-w-2xl/);
  assert.match(renderer, /sizes="\(max-width: 768px\) 100vw, 640px"/);
});
