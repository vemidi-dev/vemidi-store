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

export type ProductPersonalizationValue = {
  fieldId: string;
  fieldKey: string;
  label: string;
  value: string;
};

export type WishTemplate = {
  id: string;
  body: string;
};
