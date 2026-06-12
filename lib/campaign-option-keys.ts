import type { Product } from "@/lib/catalog";
import type { ProductOptionGroup, ProductOptionSelection } from "@/lib/product-options";
import {
  isChoiceOptionGroup,
  isTextOptionGroup,
} from "@/lib/product-options";

export const OPTION_KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

export function isValidOptionKey(key: string) {
  return OPTION_KEY_PATTERN.test(key);
}

export type CampaignOptionKeyQuery = {
  optionSelections: ProductOptionSelection[];
  optionValueKeysByGroupKey: Map<string, string[]>;
  optionTextByGroupKey: Map<string, string>;
};

export type ResolvedCampaignOptionKeys =
  | { ok: true; selections: ProductOptionSelection[] }
  | { ok: false; message: string };

function findActiveGroupByKey(
  groups: ProductOptionGroup[],
  groupKey: string,
): ProductOptionGroup | undefined {
  return groups.find((group) => group.isActive && group.key === groupKey);
}

function getUuidSelectionsByGroupId(selections: ProductOptionSelection[]) {
  const byGroupId = new Map<string, ProductOptionSelection>();
  for (const selection of selections) {
    byGroupId.set(selection.groupId, selection);
  }
  return byGroupId;
}

export function resolveHandoffOptionSelections(
  product: Product,
  query: CampaignOptionKeyQuery,
): ResolvedCampaignOptionKeys {
  const groups = product.optionGroups ?? [];
  const activeGroups = groups.filter((group) => group.isActive);
  const groupsById = new Map(activeGroups.map((group) => [group.id, group]));
  const merged = new Map<string, ProductOptionSelection>(
    getUuidSelectionsByGroupId(query.optionSelections),
  );

  for (const selection of query.optionSelections) {
    const group = groupsById.get(selection.groupId);
    if (!group) {
      continue;
    }

    if (query.optionValueKeysByGroupKey.has(group.key)) {
      return {
        ok: false,
        message: `Подадени са едновременно UUID и ключ за група „${group.name}“.`,
      };
    }

    if (query.optionTextByGroupKey.has(group.key)) {
      return {
        ok: false,
        message: `Подадени са едновременно UUID и ключ за група „${group.name}“.`,
      };
    }
  }

  for (const [rawGroupKey, rawValueKeys] of query.optionValueKeysByGroupKey) {
    if (!isValidOptionKey(rawGroupKey)) {
      return {
        ok: false,
        message: `Невалиден ключ на група опции „${rawGroupKey}“.`,
      };
    }

    const group = findActiveGroupByKey(activeGroups, rawGroupKey);
    if (!group) {
      return {
        ok: false,
        message: `Непозната група опции „${rawGroupKey}“.`,
      };
    }

    if (merged.has(group.id)) {
      return {
        ok: false,
        message: `Дублирана група опции „${rawGroupKey}“.`,
      };
    }

    if (!isChoiceOptionGroup(group)) {
      return {
        ok: false,
        message: `Стойност не е позволена за текстова група „${rawGroupKey}“.`,
      };
    }

    const valueKeys = [...new Set(rawValueKeys)];
    if (valueKeys.length !== rawValueKeys.length) {
      return {
        ok: false,
        message: `Дублирана стойност за група „${rawGroupKey}“.`,
      };
    }

    const resolvedValueIds: string[] = [];
    for (const rawValueKey of valueKeys) {
      if (!isValidOptionKey(rawValueKey)) {
        return {
          ok: false,
          message: `Невалиден ключ на стойност „${rawValueKey}“ за група „${rawGroupKey}“.`,
        };
      }

      const value = group.values.find(
        (candidate) => candidate.key === rawValueKey && candidate.isActive,
      );
      if (!value) {
        return {
          ok: false,
          message: `Непозната стойност „${rawValueKey}“ за група „${rawGroupKey}“.`,
        };
      }

      if (value.isSoldOut) {
        return {
          ok: false,
          message: `Избраната стойност „${rawValueKey}“ за група „${rawGroupKey}“ е изчерпана.`,
        };
      }

      resolvedValueIds.push(value.id);
    }

    merged.set(group.id, {
      groupId: group.id,
      valueIds: resolvedValueIds,
    });
  }

  for (const [rawGroupKey, textValue] of query.optionTextByGroupKey) {
    if (!isValidOptionKey(rawGroupKey)) {
      return {
        ok: false,
        message: `Невалиден ключ на група опции „${rawGroupKey}“.`,
      };
    }

    const group = findActiveGroupByKey(activeGroups, rawGroupKey);
    if (!group) {
      return {
        ok: false,
        message: `Непозната група опции „${rawGroupKey}“.`,
      };
    }

    if (merged.has(group.id)) {
      return {
        ok: false,
        message: `Дублирана група опции „${rawGroupKey}“.`,
      };
    }

    if (!isTextOptionGroup(group)) {
      return {
        ok: false,
        message: `Текст не е позволен за група „${rawGroupKey}“.`,
      };
    }

    merged.set(group.id, {
      groupId: group.id,
      valueIds: [],
      textValue,
    });
  }

  return {
    ok: true,
    selections: [...merged.values()],
  };
}
