export type Product = {
  slug: string;
  title: string;
  description: string;
  /** Price in EUR for demo display */
  price: number;
  tag?: string;
  imageSrc: string;
  imageAlt: string;
};

export const products: Product[] = [
  {
    slug: "engraved-vows-panel",
    title: "Engraved vows panel",
    description: "Solid walnut panel with your ceremony text, ready to hang.",
    price: 89,
    tag: "Bestseller",
    imageSrc:
      "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Delicate wedding stationery and paper goods on a soft surface",
  },
  {
    slug: "table-number-set",
    title: "Laser-cut table numbers (1–12)",
    description: "Minimal acrylic numbers with a warm matte finish.",
    price: 64,
    imageSrc:
      "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Elegant wedding reception table setting with florals",
  },
  {
    slug: "custom-monogram-sign",
    title: "Custom monogram welcome sign",
    description: "Large entrance sign with initials and event date.",
    price: 120,
    tag: "Custom",
    imageSrc:
      "https://images.unsplash.com/photo-1464366400600-71623869495a?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Outdoor wedding ceremony arch with natural light",
  },
  {
    slug: "gift-box-bundle",
    title: "Anniversary gift box bundle",
    description: "Keepsake box, two coasters, and a small engraved card.",
    price: 48,
    imageSrc:
      "https://images.unsplash.com/photo-1549465220-6a40e0a128f9?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Thoughtfully wrapped gift boxes with ribbon",
  },
];

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}
