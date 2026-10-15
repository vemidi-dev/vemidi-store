"use client";

import { prepareProductImportImages } from "@/lib/admin/product-json-import-v2/client-image-compress";

export async function prepareEventImages(payload: FormData) {
  const keys = ["image_file", "event_gallery_files"];
  const entries = keys.flatMap((key) => payload.getAll(key).filter((file): file is File => file instanceof File && file.size > 0).map((file) => ({ key, file })));
  const prepared = await prepareProductImportImages(entries.map(({ file }) => file));
  const textBytes = [...payload.entries()].reduce((sum, [, value]) => sum + (typeof value === "string" ? new TextEncoder().encode(value).length : 0), 0);
  if (prepared.preparedBytes + textBytes > 3.3 * 1024 * 1024) {
    throw new Error("Снимките са твърде големи за един запис. Добавете ги на няколко записвания или изберете по-малки файлове. Попълненото остава във формата.");
  }
  keys.forEach((key) => payload.delete(key));
  entries.forEach(({ key }, index) => payload.append(key, prepared.files[index]));
  return payload;
}
