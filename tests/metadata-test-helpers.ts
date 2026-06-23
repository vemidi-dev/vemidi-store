import type { Metadata } from "next";

function normalizeImageUrl(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof URL) {
    return value.toString();
  }

  if (value && typeof value === "object" && "url" in value) {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string") {
      return url;
    }
    if (url instanceof URL) {
      return url.toString();
    }
  }

  return undefined;
}

function normalizeImageAlt(value: unknown): string | undefined {
  if (value && typeof value === "object" && "alt" in value) {
    const alt = (value as { alt?: unknown }).alt;
    return typeof alt === "string" ? alt : undefined;
  }

  return undefined;
}

export function firstOpenGraphImage(metadata: Metadata) {
  const images = metadata.openGraph?.images;
  if (!images) {
    return undefined;
  }

  const image = Array.isArray(images) ? images[0] : images;
  const url = normalizeImageUrl(image);
  if (!url) {
    return undefined;
  }

  return {
    url,
    alt: normalizeImageAlt(image),
  };
}

export function twitterImages(metadata: Metadata): string[] | undefined {
  const images = metadata.twitter?.images;
  if (!images) {
    return undefined;
  }

  const normalized = (Array.isArray(images) ? images : [images])
    .map((image) => normalizeImageUrl(image))
    .filter((image): image is string => Boolean(image));

  return normalized.length > 0 ? normalized : undefined;
}
