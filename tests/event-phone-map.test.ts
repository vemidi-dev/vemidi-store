import assert from "node:assert/strict";
import test from "node:test";
import { isValidEventPhone } from "@/lib/events/phone";
import { getEventMapLink, isAllowedEventMapsUrl } from "@/lib/events/map-link";
import { parseBlogRichText } from "@/lib/content/blog-rich-text";

test("event phones allow local/international numbers and readable formatting", () => {
  for (const phone of ["0895627631", "+359 895 627 631", "+359 (895) 627-631", "02 123 4567", "0044 20 7946 0958", " (02) 123-4567 "]) assert.equal(isValidEventPhone(phone), true, phone);
});
test("event phones reject symbols, letters, malformed brackets and invalid digit counts", () => {
  for (const phone of ["", "-------", "+++++++", "()()()()", "abcdefgh", "0895abc631", "123456", "1234567890123456", "0888+123456", "+359)888(123456", "(0888 123456", "+359 ((888)) 123456"]) assert.equal(isValidEventPhone(phone), false, phone);
});
test("exact Google Maps link takes priority over ambiguous address search", () => {
  const maps_url = "https://maps.app.goo.gl/ExactPin";
  assert.equal(getEventMapLink({ maps_url, address: "Address", location: "Workshop name" }), maps_url);
  const fallback = new URL(getEventMapLink({ address: "София, Младост 2, бл.210", location: "Ателие" })!);
  assert.equal(fallback.searchParams.get("query"), "София, Младост 2, бл.210");
  assert.equal(getEventMapLink({ address: null, location: null }), null);
});
test("maps links only allow trusted HTTPS Google map destinations", () => {
  for (const link of ["https://maps.app.goo.gl/Pin", "https://www.google.com/maps/place/Test", "https://maps.google.bg/?q=Test", "https://goo.gl/maps/Pin"]) assert.equal(isAllowedEventMapsUrl(link), true);
  for (const link of ["javascript:alert(1)", "http://maps.google.com/", "https://google.com.evil.example/maps/Test", "https://example.com/", "https://www.google.com/search?q=Test", "https://user:pass@maps.google.com/"]) assert.equal(isAllowedEventMapsUrl(link), false);
});
test("workshop text preserves single line breaks without changing blog behavior", () => {
  const text = "Първи ред\nВтори **важен** ред\n\nТрети абзац";
  const blocks = parseBlogRichText(text, { preserveLineBreaks: true });
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].type, "paragraph");
  if (blocks[0].type !== "paragraph") throw new Error("Expected paragraph");
  assert.deepEqual(blocks[0].children[0], { type: "text", value: "Първи ред\nВтори " });
  const blog = parseBlogRichText(text)[0];
  if (blog.type !== "paragraph") throw new Error("Expected blog paragraph");
  assert.deepEqual(blog.children[0], { type: "text", value: "Първи ред Втори " });
});
