import type { ProductColorField } from "@/lib/product-colors";
import type { ProductPersonalizationField, WishTemplate } from "@/lib/product-personalization";

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  slug: string;
  title: string;
  description: string;
  additionalInfo?: string | null;
  fulfillmentNote?: string | null;
  /** Price in EUR. */
  price: number;
  tag?: string;
  images: ProductImage[];
  /** When true, customer can enter up to 50 characters before adding to cart. */
  customizable?: boolean;
  /** Optional color configuration grouped by material/type. */
  colorFields?: ProductColorField[];
  personalizationFields?: ProductPersonalizationField[];
  wishTemplates?: WishTemplate[];
};
