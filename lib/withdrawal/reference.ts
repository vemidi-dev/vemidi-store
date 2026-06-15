import { randomBytes } from "node:crypto";

export function buildWithdrawalReferenceNumber(now = new Date()) {
  const datePart = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");

  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `WDR-${datePart}-${suffix}`;
}
