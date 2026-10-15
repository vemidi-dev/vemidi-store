export const EVENT_PHONE_ERROR = "Въведете валиден телефон със 7 до 15 цифри. Може да използвате +, интервали, скоби и тирета.";

export function isValidEventPhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length > 30 || !/^\+?[0-9 ()-]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return false;
  let parentheses = 0;
  for (const character of trimmed) {
    if (character === "(" && ++parentheses > 1) return false;
    if (character === ")" && --parentheses < 0) return false;
  }
  return parentheses === 0;
}
