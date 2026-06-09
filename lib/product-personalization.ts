export type ProductPersonalizationField = {
  id: string;
  label: string;
  key: string;
  type: "text" | "textarea" | "date";
  placeholder: string | null;
  maxLength: number;
  required: boolean;
  allowsWishTemplates: boolean;
};

export type WishTemplate = {
  id: string;
  title: string;
  body: string;
  occasionSlugs: string[];
};
