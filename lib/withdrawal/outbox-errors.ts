export function isWithdrawalNotificationOutboxUnavailable(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code = String((error as { code?: string }).code);
  return code === "42P01" || code === "PGRST205";
}
