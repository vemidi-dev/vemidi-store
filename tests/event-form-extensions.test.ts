import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareEventFormExtensions } from "@/lib/admin/event-form-extensions";
import { defaultEventRegistrationSettings } from "@/lib/events/registration-config";

function client(failAt = 0) {
  const uploads: string[] = [];
  const removed: string[] = [];
  const supabase = { storage: { from: () => ({ upload: async (path: string) => {
    uploads.push(path);
    return { error: uploads.length === failAt ? { message: "upload_failed" } : null };
  }, remove: async (paths: string[]) => { removed.push(...paths); return { error: null }; } }) } } as unknown as SupabaseClient;
  return { supabase, uploads, removed };
}
const image = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])], "photo.png", { type: "image/png" });
const form = () => {
  const data = new FormData();
  data.set("registration_settings", JSON.stringify(defaultEventRegistrationSettings));
  data.set("event_gallery_images", "[]");
  return data;
};

test("legacy event form does not write new fields", async () => {
  const { supabase, uploads } = client();
  assert.deepEqual(await prepareEventFormExtensions(supabase, new FormData(), "Workshop"), { row: {}, uploadedPaths: [] });
  assert.equal(uploads.length, 0);
});
test("maps links can be set/cleared, with a safe pre-migration empty default", async () => {
  const { supabase } = client();
  const data = new FormData();
  data.set("maps_url", "");
  assert.deepEqual((await prepareEventFormExtensions(supabase, data, "Workshop")).row, {});
  data.set("maps_url_present", "1");
  assert.deepEqual((await prepareEventFormExtensions(supabase, data, "Workshop")).row, { maps_url: null });
  data.set("maps_url", "https://maps.app.goo.gl/ExactPin");
  assert.deepEqual((await prepareEventFormExtensions(supabase, data, "Workshop")).row, { maps_url: "https://maps.app.goo.gl/ExactPin" });
  data.set("maps_url", "https://example.com/");
  await assert.rejects(prepareEventFormExtensions(supabase, data, "Workshop"), /Google Maps/);
});
test("invalid settings and oversized galleries fail before uploading", async () => {
  const { supabase, uploads } = client();
  const data = form();
  data.set("registration_settings", '{"allowedTypes":[]}');
  await assert.rejects(prepareEventFormExtensions(supabase, data, "Workshop"), /вид участник/);
  data.set("registration_settings", "{}");
  data.set("event_gallery_images", JSON.stringify(Array(12).fill({ image_url: "https://example.com/photo.png", alt_text: "Photo" })));
  data.append("event_gallery_files", image());
  await assert.rejects(prepareEventFormExtensions(supabase, data, "Workshop"), /до 12 снимки/);
  assert.equal(uploads.length, 0);
});
test("partial gallery upload failure removes already uploaded files", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  try {
    const { supabase, uploads, removed } = client(2);
    const data = form();
    data.append("event_gallery_files", image());
    data.append("event_gallery_files", image());
    await assert.rejects(prepareEventFormExtensions(supabase, data, "Workshop"), /upload_failed/);
    assert.deepEqual(removed, [uploads[0]]);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});
test("gallery keeps existing image descriptions and adds new photos", async () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  try {
    const { supabase } = client();
    const data = form();
    data.set("event_gallery_images", JSON.stringify([{ image_url: "https://example.com/old.png", alt_text: "Existing photo" }]));
    data.append("event_gallery_files", image());
    const result = await prepareEventFormExtensions(supabase, data, "Workshop");
    assert.equal(result.uploadedPaths.length, 1);
    assert.deepEqual((result.row.gallery_images as { alt_text: string }[]).map((photo) => photo.alt_text), ["Existing photo", "Workshop"]);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  }
});
