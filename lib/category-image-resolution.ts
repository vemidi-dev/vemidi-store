import { getCategoryImageSrc } from "@/lib/category-images";

export type CategoryImageSource = {
  name: string;
  slug: string;
  category_type: "product" | "occasion";
  image_url?: string | null;
  image_alt?: string | null;
  cover_image_url?: string | null;
  cover_image_alt?: string | null;
};

function resolveCategoryCardImageSrc(category: CategoryImageSource): string {
  return (
    category.image_url?.trim() ||
    getCategoryImageSrc(category.slug, category.category_type) ||
    ""
  );
}

export function resolveCategoryCardImage(category: CategoryImageSource): {
  src: string;
  alt: string;
} {
  return {
    src: resolveCategoryCardImageSrc(category),
    alt: category.image_alt?.trim() || category.name,
  };
}

export function resolveCategoryCoverImage(
  category: CategoryImageSource,
  parent?: CategoryImageSource | null,
): { src: string; alt: string } {
  const coverSrc = category.cover_image_url?.trim();
  if (coverSrc) {
    return {
      src: coverSrc,
      alt: category.cover_image_alt?.trim() || category.name,
    };
  }

  const cardUrl = category.image_url?.trim();
  if (cardUrl) {
    return {
      src: cardUrl,
      alt: category.image_alt?.trim() || category.name,
    };
  }

  const staticCategory = parent ?? category;
  return {
    src: getCategoryImageSrc(staticCategory.slug, staticCategory.category_type),
    alt:
      category.cover_image_alt?.trim() ||
      category.image_alt?.trim() ||
      category.name,
  };
}
