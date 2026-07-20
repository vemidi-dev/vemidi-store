export function normalizeCouponCode(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }

  const code = raw.trim().toUpperCase();
  if (!code) {
    return null;
  }

  if (!/^[A-Z0-9]{4,32}$/.test(code)) {
    return null;
  }

  return code;
}
