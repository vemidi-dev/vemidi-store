import type { CartLine } from "@/lib/cart-types";
import { formatPriceDelta } from "@/lib/product-option-pricing";
import type { ProductOptionGroup } from "@/lib/product-options";

type CartLineOptionsProps = {
  line: CartLine;
  optionGroups?: ProductOptionGroup[];
};

export function CartLineOptions({ line, optionGroups }: CartLineOptionsProps) {
  const selections = line.optionSelections ?? [];
  if (!selections.length) {
    return null;
  }

  const groupsById = new Map((optionGroups ?? []).map((group) => [group.id, group]));

  return (
    <>
      {selections.map((selection) => {
        const group = groupsById.get(selection.groupId);
        const groupName = group?.name ?? "Опция";

        if (selection.textValue) {
          const delta = group ? formatPriceDelta(group.textPriceDelta) : null;
          return (
            <p key={selection.groupId} className="mt-1 text-xs text-boutique-muted">
              {groupName}: {selection.textValue}
              {delta ? ` (${delta})` : ""}
            </p>
          );
        }

        return selection.valueIds.map((valueId) => {
          const value = group?.values.find((candidate) => candidate.id === valueId);
          const delta = value ? formatPriceDelta(value.priceDelta) : null;
          return (
            <p key={`${selection.groupId}-${valueId}`} className="mt-1 text-xs text-boutique-muted">
              {groupName}: {value?.label ?? "—"}
              {delta ? ` (${delta})` : ""}
            </p>
          );
        });
      })}
    </>
  );
}
