export type ProductOptionInputType =
  | "single"
  | "multiple"
  | "text"
  | "textarea"
  | "date";

export type ProductOptionValue = {
  id: string;
  label: string;
  key: string;
  priceDelta: number;
  isDefault: boolean;
  isActive: boolean;
  isSoldOut: boolean;
  imageUrl?: string | null;
  sku?: string | null;
  sortOrder: number;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  key: string;
  inputType: ProductOptionInputType;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  sortOrder: number;
  isActive: boolean;
  pricingMode: "delta";
  dependsOnOptionId?: string | null;
  placeholder?: string | null;
  maxLength?: number | null;
  textPriceDelta: number;
  values: ProductOptionValue[];
};

/** Submitted cart/checkout selection (no trusted prices). */
export type ProductOptionSelection = {
  groupId: string;
  valueIds: string[];
  textValue?: string;
};

/** Normalized snapshot stored on orders. */
export type ProductOptionSelectionSnapshotValue = {
  valueId: string;
  label: string;
  key: string;
  priceDelta: number;
  imageUrl?: string | null;
  sku?: string | null;
};

export type ProductOptionSelectionSnapshot = {
  groupId: string;
  groupName: string;
  groupKey: string;
  inputType: ProductOptionInputType;
  textValue?: string | null;
  values: ProductOptionSelectionSnapshotValue[];
  groupPriceDelta: number;
};

export function isChoiceOptionGroup(group: ProductOptionGroup) {
  return group.inputType === "single" || group.inputType === "multiple";
}

export function isTextOptionGroup(group: ProductOptionGroup) {
  return group.inputType === "text" || group.inputType === "textarea" || group.inputType === "date";
}

export function getBooleanOptionValues(group: ProductOptionGroup) {
  if (group.inputType !== "single") {
    return null;
  }

  const activeValues = group.values.filter((value) => value.isActive);
  const yes = activeValues.find((value) => value.key === "yes");
  const no = activeValues.find((value) => value.key === "no");

  return yes && no && activeValues.length === 2 ? { yes, no } : null;
}

export function getVisibleOptionGroups(
  groups: ProductOptionGroup[],
  selections: ProductOptionSelection[],
): ProductOptionGroup[] {
  const selectedValueIds = new Set(
    selections.flatMap((selection) => selection.valueIds),
  );

  return groups
    .filter((group) => group.isActive)
    .filter((group) => {
      if (!group.dependsOnOptionId) {
        return true;
      }
      return selectedValueIds.has(group.dependsOnOptionId);
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "bg"));
}

export function buildDefaultOptionSelections(
  groups: ProductOptionGroup[],
): ProductOptionSelection[] {
  const visible = getVisibleOptionGroups(groups, []);
  return visible.flatMap((group) => {
    if (!isChoiceOptionGroup(group)) {
      return [];
    }
    const defaults = group.values.filter(
      (value) => value.isActive && !value.isSoldOut && value.isDefault,
    );
    if (defaults.length === 0) {
      return [];
    }
    return [{
      groupId: group.id,
      valueIds: defaults.map((value) => value.id),
    }];
  });
}

export function buildProductOptionDefaultsSignature(
  groups: ProductOptionGroup[],
) {
  return groups
    .filter((group) => group.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
    .map((group) => {
      if (!isChoiceOptionGroup(group)) {
        return `${group.id}:text`;
      }

      const defaults = group.values
        .filter((value) => value.isActive && !value.isSoldOut && value.isDefault)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .map((value) => value.id)
        .join(",");

      return `${group.id}:${defaults}`;
    })
    .join("|");
}
