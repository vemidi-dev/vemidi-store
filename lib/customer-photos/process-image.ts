import sharp from "sharp";
import { CUSTOMER_PHOTO_MAX_BYTES } from "./reference";

export async function processCustomerPhoto(input: Buffer) {
  if (!input.length || input.length > CUSTOMER_PHOTO_MAX_BYTES) {
    throw new Error("Изберете снимка до 4 MB.");
  }
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  if (!png && !jpeg) throw new Error("Позволени са само JPEG и PNG снимки.");
  const options = { limitInputPixels: 40_000_000, failOn: "warning" as const };
  const meta = await sharp(input, options).metadata();
  if (!meta.width || !meta.height || (meta.pages ?? 1) > 1) {
    throw new Error("Изберете обикновена, неанимирана снимка.");
  }
  // Decode and re-encode to verify content, apply orientation and strip private EXIF data.
  const image = sharp(input, options).rotate();
  const data = await (png ? image.png() : image.jpeg({ quality: 95 })).toBuffer();
  if (data.length > 16 * 1024 * 1024) throw new Error("Снимката е прекалено голяма след обработка.");
  return { data, extension: png ? "png" : "jpg", contentType: png ? "image/png" : "image/jpeg" };
}
