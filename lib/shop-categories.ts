import type { CategoryType } from "@/lib/admin/types";

export const DEFAULT_CATEGORY_CARD_DESCRIPTION =
  "Открийте ръчно изработени подаръци с възможност за персонализация.";

export type ShopCategory = {
  id: string;
  slug: string;
  title: string;
  categoryType: CategoryType;
  parentId: string | null;
  imageSrc: string;
  imageAlt: string;
  cardDescription: string | null;
};
