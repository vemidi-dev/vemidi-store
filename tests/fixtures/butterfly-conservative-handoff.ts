import type { Product } from "@/lib/catalog";
import type { ProductOptionGroup } from "@/lib/product-options";
import type { ProductPersonalizationField } from "@/lib/product-personalization";

/** Live product UUID from Stage 0 audit — fixture only, no DB access. */
export const BUTTERFLY_PRODUCT_ID = "d594ddce-2fb5-49e0-859d-9ff91e752b9d";

export const BUTTERFLY_PRODUCT_SLUG = "tvorcheski-komplekt-valshebni-peperudi";

export const BUTTERFLY_BASE_PRICE = 13.5;

export const BUTTERFLY_LANDING_URL =
  "https://special.vemidi-crafts.com/valshebni-peperudi";

export const BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY =
  "field_e0bd392877ce4fa2841f3c81ac0b21db";

export const butterflyLegacyPersonalizationFieldId =
  "e0222a4c-71f4-499b-9303-4f491e8f5024";

export const groupRazmerId = "208a00a9-9e87-4881-bd2a-145342778762";
export const groupColoringId = "cccccccc-cccc-4ccc-8ccc-cccccccccc01";

export const valueMiniId = "91f5e1d9-8ca3-4a4e-85f4-b980abc468d8";
export const valueStandardId = "100de077-d57a-4556-b380-0a5dca0fce8d";
export const valueMaxiId = "066a54d1-22f9-4ba3-a0e3-ed6a59ddbb0a";

export const valuePaintsId = "dddddddd-dddd-4ddd-8ddd-dddddddddd01";
export const valueMarkersId = "dddddddd-dddd-4ddd-8ddd-dddddddddd02";

export const butterflyLegacyPersonalizationField: ProductPersonalizationField = {
  id: butterflyLegacyPersonalizationFieldId,
  label: "Име или кратък текст на табелката",
  key: BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY,
  type: "text",
  placeholder: null,
  maxLength: 50,
  priceDelta: 2.5,
  required: false,
  allowsWishTemplates: false,
};

/** POST handoff contract — live `razmer_na_komplekta`, `coloring`, legacy `pf_` field. */
export const butterflyConservativeOptionGroups: ProductOptionGroup[] = [
  {
    id: groupRazmerId,
    name: "Размер на комплекта",
    key: "razmer_na_komplekta",
    inputType: "single",
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 0,
    isActive: true,
    pricingMode: "delta",
    textPriceDelta: 0,
    values: [
      {
        id: valueMiniId,
        label: "Комплект Мини - 1 пеперуда + 2 водни кончета (3 фигури)",
        key: "komplekt_mini_1_peperuda_2_vodni_koncheta",
        priceDelta: 0,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
      {
        id: valueStandardId,
        label: "Комплект Стандарт - 2 пеперуди + 3 водни кончета (5 фигури)",
        key: "komplekt_standart_2_peperuda_3_vodni_koncheta",
        priceDelta: 4.5,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        sortOrder: 1,
      },
      {
        id: valueMaxiId,
        label: "Комплект Макси - 3 пеперуди + 4 водни кончета (7 фигури)",
        key: "komplekt_maksi_3_peperuda_4_vodni_koncheta",
        priceDelta: 10.5,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 2,
      },
    ],
  },
  {
    id: groupColoringId,
    name: "Оцветяване",
    key: "coloring",
    inputType: "single",
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 1,
    isActive: true,
    pricingMode: "delta",
    textPriceDelta: 0,
    values: [
      {
        id: valuePaintsId,
        label: "Бои с четка",
        key: "paints",
        priceDelta: 0,
        isDefault: true,
        isActive: true,
        isSoldOut: false,
        sortOrder: 0,
      },
      {
        id: valueMarkersId,
        label: "Флумастери",
        key: "markers",
        priceDelta: 0,
        isDefault: false,
        isActive: true,
        isSoldOut: false,
        sortOrder: 1,
      },
    ],
  },
];

export const butterflyConservativeProduct: Product = {
  id: BUTTERFLY_PRODUCT_ID,
  slug: BUTTERFLY_PRODUCT_SLUG,
  productCode: "VM-000016",
  title: "Творчески комплект Вълшебни пеперуди",
  description: "Описание",
  price: BUTTERFLY_BASE_PRICE,
  images: [{ src: "/img.jpg", alt: "Пеперуда" }],
  customizable: true,
  fulfillmentType: "made_to_order",
  availabilityLabel: "Изработва се по поръчка",
  orderable: true,
  optionGroups: butterflyConservativeOptionGroups,
  personalizationFields: [butterflyLegacyPersonalizationField],
  hasUniversalOptions: true,
};

export const butterflyLandingHandoffQuery = {
  product: BUTTERFLY_PRODUCT_ID,
  campaign: "butterflies",
  source: "campaign-butterflies",
  landing: BUTTERFLY_LANDING_URL,
  quantity: "1",
} as const;

export const butterflyPostHandoffFields = {
  ...butterflyLandingHandoffQuery,
  option_razmer_na_komplekta: "komplekt_mini_1_peperuda_2_vodni_koncheta",
  option_coloring: "paints",
} as const;

export const butterflyPostHandoffWithNameFields = {
  ...butterflyPostHandoffFields,
  [`pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`]: "Мария",
} as const;
