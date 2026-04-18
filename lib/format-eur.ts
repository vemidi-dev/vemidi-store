/** Formats an amount in euro for display (e.g. `89,00 €` in bg locale). */
export function formatEur(amount: number): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
