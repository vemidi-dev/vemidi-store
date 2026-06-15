import type { Metadata } from "next";

type PageMetadataBase = {
  title: string;
  description: string;
};

export function buildIndexableMetadata(
  canonicalPath: string,
  base: PageMetadataBase,
): Metadata {
  return {
    title: base.title,
    description: base.description,
    alternates: { canonical: canonicalPath },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      title: base.title,
      description: base.description,
      url: canonicalPath,
    },
    twitter: {
      card: "summary_large_image",
      title: base.title,
      description: base.description,
    },
  };
}

export function buildFacetedNoindexMetadata(
  canonicalPath: string,
  base: PageMetadataBase,
): Metadata {
  return {
    title: base.title,
    description: base.description,
    alternates: { canonical: canonicalPath },
    robots: { index: false, follow: true },
  };
}
