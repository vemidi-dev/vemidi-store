import type { ProductOptionGroup } from "@/lib/product-options";
import type { ProductColorField } from "@/lib/product-colors";
import type { ProductPersonalizationField, WishTemplate } from "@/lib/product-personalization";
import type { ProductPromotionSnapshot } from "@/lib/product-pricing";

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  /** Internal UUID primary key — used for cart, checkout, and orders. */
  id: string;
  /** Public SEO slug for storefront URLs. */
  slug: string;
  /** Human-readable product code, e.g. VM-000123. */
  productCode: string;
  title: string;
  description: string;
  additionalInfo?: string | null;
  fulfillmentNote?: string | null;
  /** Current effective price in EUR. */
  price: number;
  /** Original list price when a promotion is active. */
  compareAtPrice?: number | null;
  promotion?: ProductPromotionSnapshot | null;
  /** Admin-selected storefront badge, e.g. Ново or По поръчка. */
  cardBadge?: string | null;
  images: ProductImage[];
  /** Set on catalog listings when the product has enabled color fields. */
  hasColorOptions?: boolean;
  /** Set on catalog listings when the product has personalization fields. */
  hasPersonalizationOptions?: boolean;
  /** Set on catalog listings when the product has universal option groups. */
  hasUniversalOptions?: boolean;
  /** When true, customer can enter up to 50 characters before adding to cart. */
  customizable?: boolean;
  /** When true, the product is shown as sold out and cannot be ordered. */
  soldOut?: boolean;
  /** Optional color configuration grouped by material/type. */
  colorFields?: ProductColorField[];
  optionGroups?: ProductOptionGroup[];
  personalizationFields?: ProductPersonalizationField[];
  wishTemplates?: WishTemplate[];
};
