export function getColorFieldOptionIds(
  options: readonly { id: string }[],
): string[] {
  return options.map((option) => option.id);
}

export function areAllColorFieldOptionsSelected(
  options: readonly { id: string }[],
  selectedOptionIds: readonly string[],
): boolean {
  if (options.length === 0) {
    return false;
  }

  const selectedSet = new Set(selectedOptionIds);
  return options.every((option) => selectedSet.has(option.id));
}
