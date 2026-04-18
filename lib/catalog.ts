import type { ProductColorField } from "@/lib/product-colors";

export type ProductImage = {
  src: string;
  alt: string;
};

export type Product = {
  slug: string;
  title: string;
  description: string;
  /** Price in EUR (€). */
  price: number;
  tag?: string;
  images: ProductImage[];
  /** When true, customer can enter up to 50 characters before adding to cart. */
  customizable?: boolean;
  /** Optional color configuration grouped by material/type. */
  colorFields?: ProductColorField[];
};

export const products: Product[] = [
  {
    slug: "engraved-vows-panel",
    title: "Панел с гравирани обети",
    description:
      "Орехов панел с текст от церемонията, готов за окачване. Повърхността е обработена на ръка; гравирането следва вашия текст с внимание към типографията и интервалите.",
    price: 89,
    tag: "Хит",
    customizable: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=80",
        alt: "Деликатна сватбена хартия и аксесоари",
      },
      {
        src: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80",
        alt: "Близък план на дървена текстура и нежен светлина",
      },
      {
        src: "https://images.unsplash.com/photo-1522673602040-be62fb37a668?auto=format&fit=crop&w=900&q=80",
        alt: "Елегантни покани и печат в топли тонове",
      },
    ],
  },
  {
    slug: "table-number-set",
    title: "Номера на маси (1–12), лазерно изрязани",
    description:
      "Минималистични акрилни номера с топъл матов финиш. Комплектът включва стойки за стабилно поставяне върху масата.",
    price: 64,
    images: [
      {
        src: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80",
        alt: "Елегантна сватбена маса с цветя",
      },
      {
        src: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80",
        alt: "Подредени маси на тържество с декорация",
      },
    ],
  },
  {
    slug: "custom-monogram-sign",
    title: "Персонализирана табела с монограм",
    description:
      "Голяма входна табела с инициали и дата на събитието. Подходяща за приемна, градина или зала — изработка по вашите размери и шрифт.",
    price: 120,
    tag: "По поръчка",
    customizable: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
        alt: "Сватбени халки и нежни цветя",
      },
      {
        src: "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?auto=format&fit=crop&w=900&q=80",
        alt: "Детайл от сватбена украса и монограм",
      },
    ],
  },
  {
    slug: "gift-box-bundle",
    title: "Подаръчен комплект за юбилей",
    description:
      "Кутия за спомен, два подложки и малка гравирана картичка. Идеален подарък с лично послание.",
    price: 48,
    customizable: true,
    images: [
      {
        src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80",
        alt: "Празнична украса и свещи",
      },
      {
        src: "https://images.unsplash.com/photo-1513885535751-8b9238be3456?auto=format&fit=crop&w=900&q=80",
        alt: "Опакован подарък с панделка",
      },
    ],
  },
];

export function getProductBySlug(slug: string) {
  return products.find((p) => p.slug === slug);
}
