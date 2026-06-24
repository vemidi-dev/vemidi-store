import { buildAbsoluteUrl } from "@/lib/seo/breadcrumbs";
import { getProductUrl } from "@/lib/product-url";

export type CollectionSchemaProduct = {
  title: string;
  slug: string;
  imageSrc?: string | null;
};

export type BuildCollectionPageSchemaInput = {
  name: string;
  description: string;
  canonicalPath: string;
  products: CollectionSchemaProduct[];
  siteUrl: URL;
};

function toAbsoluteImageUrl(
  imageSrc: string | null | undefined,
  siteUrl: URL,
): string | undefined {
  if (!imageSrc?.trim()) {
    return undefined;
  }

  try {
    return new URL(imageSrc, siteUrl).toString();
  } catch {
    return undefined;
  }
}

export function shouldRenderCollectionSchema(input: {
  indexable: boolean;
  faceted: boolean;
  products: CollectionSchemaProduct[];
}): boolean {
  return input.indexable && !input.faceted && input.products.length > 0;
}

export function toCollectionSchemaProducts(
  products: Array<{
    title: string;
    slug: string;
    images: Array<{ src: string }>;
  }>,
): CollectionSchemaProduct[] {
  return products.map((product) => ({
    title: product.title,
    slug: product.slug,
    imageSrc: product.images[0]?.src ?? null,
  }));
}

export function buildCollectionPageSchema({
  name,
  description,
  canonicalPath,
  products,
  siteUrl,
}: BuildCollectionPageSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: buildAbsoluteUrl(canonicalPath, siteUrl),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => {
        const item: Record<string, string> = {
          "@type": "Thing",
          name: product.title,
          url: getProductUrl(product, siteUrl.toString()),
        };
        const image = toAbsoluteImageUrl(product.imageSrc, siteUrl);

        if (image) {
          item.image = image;
        }

        return {
          "@type": "ListItem",
          position: index + 1,
          item,
        };
      }),
    },
  };
}
