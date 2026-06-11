export const DEFAULT_CATEGORY_CARD_DESCRIPTION =
  "Открийте ръчно изработени подаръци с възможност за персонализация.";

export type ShopCategory = {
  slug: string;
  title: string;
  categoryType: "product" | "occasion";
  imageSrc: string;
  imageAlt: string;
  cardDescription: string | null;
};
