import type { SupabaseClient } from "@supabase/supabase-js";
import { readEventSettingsForm, type EventPhoto } from "@/lib/events/registration-config";
import { deleteProductImage, uploadAdminImage } from "@/lib/admin/storage";
import { getFiles } from "@/lib/admin/form-data";
import { isAllowedEventMapsUrl } from "@/lib/events/map-link";

export async function prepareEventFormExtensions(supabase: SupabaseClient, form: FormData, title: string) {
  const row: Record<string, unknown> = {};
  const uploadedPaths: string[] = [];
  const mapsUrl = String(form.get("maps_url") ?? "").trim();
  if (mapsUrl && !isAllowedEventMapsUrl(mapsUrl)) throw new Error("Добавете валиден HTTPS линк от Google Maps.");
  if (mapsUrl || form.get("maps_url_present") === "1") row.maps_url = mapsUrl || null;
  if (form.has("registration_settings")) {
    const config = readEventSettingsForm(form);
    if (config.error) throw new Error(config.error);
    row.registration_settings = config.settings;
    if (config.settings.materialsPricing) row.price = Math.min(config.settings.materialsPricing.studio.price, config.settings.materialsPricing.home.price);
  }
  if (form.has("event_gallery_images")) {
    let gallery: EventPhoto[];
    try {
      const raw: unknown = JSON.parse(String(form.get("event_gallery_images")));
      if (!Array.isArray(raw) || raw.length > 12 || raw.some((p) => !p || typeof p.image_url !== "string" || !/^https?:\/\//.test(p.image_url) || typeof p.alt_text !== "string" || p.alt_text.length > 200)) throw new Error();
      gallery = raw;
    } catch { throw new Error("Невалидна галерия на събитието."); }
    const files = getFiles(form, "event_gallery_files");
    if (gallery.length + files.length > 12) throw new Error("Галерията може да съдържа до 12 снимки.");
    try {
      for (const file of files) {
        const uploaded = await uploadAdminImage(supabase, file, "events/gallery");
        uploadedPaths.push(uploaded.path);
        gallery.push({ image_url: uploaded.url, alt_text: title });
      }
    } catch (error) {
      await Promise.all(uploadedPaths.map((path) => deleteProductImage(supabase, path).catch(() => undefined)));
      throw error;
    }
    row.gallery_images = gallery;
  }
  return { row, uploadedPaths };
}
