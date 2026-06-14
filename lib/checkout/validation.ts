import { checkoutErrorMessages, mapCheckoutError } from "@/lib/checkout/errors";
import {
  validateDeliveryPayload,
  type CheckoutDeliveryPayload,
} from "@/lib/checkout/delivery-payload";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validatePrivacyConsent(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

export function validateIdempotencyKey(value: string): boolean {
  return UUID_V4.test(value.trim());
}

export function validateCustomerName(value: string): boolean {
  return value.trim().length >= 2;
}

export function validateCustomerPhone(value: string): boolean {
  return value.trim().length >= 6;
}

export function validateCustomerEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function validateCheckoutDelivery(
  delivery: CheckoutDeliveryPayload,
): string | null {
  return validateDeliveryPayload(delivery);
}

export function mapRpcCheckoutError(message: string): string {
  return mapCheckoutError(message);
}

export function getCheckoutErrorMessage(code: keyof typeof checkoutErrorMessages): string {
  return checkoutErrorMessages[code];
}
