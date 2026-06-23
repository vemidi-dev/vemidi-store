import type { Metadata } from "next";

export type SeoSocialImage = {
  src: string;
  alt: string;
};

export function appendOpenGraphAndTwitterImages(
  metadata: Metadata,
  image?: SeoSocialImage | null,
): Metadata {
  if (!image?.src) {
    return metadata;
  }

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [{ url: image.src, alt: image.alt }],
    },
    twitter: {
      ...metadata.twitter,
      card: "summary_large_image",
      images: [image.src],
    },
  };
}
