export const adminFormFields = {
  common: {
    tab: "tab",
    id: "id",
  },
  product: {
    name: "name",
    description: "description",
    additionalInfo: "additional_info",
    fulfillmentNote: "fulfillment_note",
    price: "price",
    imageFile: "image_file",
    existingImageUrl: "existing_image_url",
    isCustomizable: "is_customizable",
    categoryIds: "category_ids",
  },
  category: {
    name: "name",
    slug: "slug",
    type: "category_type",
  },
  colorField: {
    labels: "color_field_label[]",
    groupIds: "color_field_group_id[]",
    minSelects: "color_field_min_select[]",
    maxSelects: "color_field_max_select[]",
    optionIds: "color_field_option_ids[]",
  },
} as const;
