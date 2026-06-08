import type { Product } from "@/lib/catalog";
import type { ShopCategory } from "@/lib/shop-categories";
import type { StorefrontCategory } from "@/lib/storefront/types";

export const DEFAULT_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80";

export const DEFAULT_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=800&q=80";

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  additional_info?: string | null;
  fulfillment_note?: string | null;
  price: number;
  image_url: string | null;
  is_customizable: boolean;
};

export function toProduct(row: ProductRow): Product {
  return {
    slug: row.id,
    title: row.name,
    description: row.description,
    additionalInfo: row.additional_info,
    fulfillmentNote: row.fulfillment_note,
    price: Number(row.price),
    customizable: row.is_customizable,
    images: [
      {
        src: row.image_url ?? DEFAULT_PRODUCT_IMAGE,
        alt: row.name,
      },
    ],
  };
}

export function toShowcaseCategory(category: StorefrontCategory): ShopCategory {
  return {
    slug: category.slug,
    title: category.name,
    imageSrc: DEFAULT_CATEGORY_IMAGE,
    imageAlt: `${category.name} - категория продукти`,
  };
}
