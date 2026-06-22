export function buildProductCountByCategoryId(
  categoryIdsByProductId: Map<string, string[]>,
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const categoryIds of categoryIdsByProductId.values()) {
    for (const categoryId of categoryIds) {
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
  }

  return counts;
}
