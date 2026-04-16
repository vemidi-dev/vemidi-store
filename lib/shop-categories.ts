export type ShopCategory = {
  /** Query key for `/products?category=…` */
  slug: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
};

export const shopCategories: ShopCategory[] = [
  {
    slug: "svatba",
    title: "Сватба",
    imageSrc:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Сватбени халки и нежни цветя в топла светлина",
  },
  {
    slug: "bebe-krushtene",
    title: "Бебе и кръщене",
    imageSrc:
      "https://images.unsplash.com/photo-1515488042361-ee00e0ddd7e4?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Мека детска стая с неутрални тонове и уют",
  },
  {
    slug: "yubiley",
    title: "Юбилей",
    imageSrc:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Празнична украса и свещи за тържество",
  },
  {
    slug: "dekoracia-dom",
    title: "Декорация за дома",
    imageSrc:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Минималистичен интериор с растение и естествена светлина",
  },
  {
    slug: "personalizirani",
    title: "Персонализирани подаръци",
    imageSrc:
      "https://images.unsplash.com/photo-1549465220-6a40e0a128f9?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Внимателно опаковани подаръци с панделка",
  },
];
