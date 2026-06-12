import type { AdminData } from "@/lib/admin/data";
import type { ParsedOptionGroup } from "@/lib/admin/types";

export function buildDependencyOptionsFromAdminData(data: AdminData) {
  const options: Array<{ id: string; label: string; groupName: string }> = [];

  data.optionGroupsByProductId.forEach((groups, productId) => {
    groups.forEach((group) => {
      const values = data.optionValuesByGroupId.get(group.id) ?? [];
      values.forEach((value) => {
        options.push({
          id: value.id,
          label: value.label,
          groupName: `${group.name} (${productId.slice(0, 8)})`,
        });
      });
    });
  });

  return options;
}

export function buildDependencyOptionsFromGroups(groups: ParsedOptionGroup[]) {
  return groups.flatMap((group) =>
    group.values.map((value) => ({
      id: value.id ?? `${group.key}:${value.key}`,
      label: value.label,
      groupName: group.name,
    })),
  );
}
