import type { ProductOptionGroup } from "@/lib/product-options";

type OptionGroupRow = {
  id: string;
  name: string;
  key: string;
  input_type: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  is_active: boolean;
  pricing_mode: string;
  depends_on_option_id: string | null;
  placeholder: string | null;
  max_length: number | null;
  text_price_delta: number;
};

type OptionValueRow = {
  id: string;
  group_id: string;
  label: string;
  key: string;
  price_delta: number;
  is_default: boolean;
  is_active: boolean;
  is_sold_out: boolean;
  sku: string | null;
  sort_order: number;
};

export function mapProductOptionGroups(
  groups: OptionGroupRow[],
  values: OptionValueRow[],
): ProductOptionGroup[] {
  const valuesByGroup = new Map<string, OptionValueRow[]>();
  values.forEach((value) => {
    const list = valuesByGroup.get(value.group_id) ?? [];
    list.push(value);
    valuesByGroup.set(value.group_id, list);
  });

  return groups
    .filter((group) => group.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "bg"))
    .map((group) => ({
      id: group.id,
      name: group.name,
      key: group.key,
      inputType: group.input_type as ProductOptionGroup["inputType"],
      isRequired: group.is_required,
      minSelect: group.min_select,
      maxSelect: group.max_select,
      sortOrder: group.sort_order,
      isActive: group.is_active,
      pricingMode: "delta" as const,
      dependsOnOptionId: group.depends_on_option_id,
      placeholder: group.placeholder,
      maxLength: group.max_length,
      textPriceDelta: Number(group.text_price_delta) || 0,
      values: (valuesByGroup.get(group.id) ?? [])
        .filter((value) => value.is_active)
        .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label, "bg"))
        .map((value) => ({
          id: value.id,
          label: value.label,
          key: value.key,
          priceDelta: Number(value.price_delta) || 0,
          isDefault: value.is_default,
          isActive: value.is_active,
          isSoldOut: value.is_sold_out,
          sku: value.sku,
          sortOrder: value.sort_order,
        })),
    }));
}
