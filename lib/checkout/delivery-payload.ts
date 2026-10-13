import { formatEcontOfficeLabel, type EcontOffice } from "@/lib/shipping/econt";
import { formatSpeedyOfficeLabel, type SpeedyOffice } from "@/lib/shipping/speedy";

export type CheckoutDeliveryType = "office" | "automat" | "address";
export type CheckoutCourier = "econt" | "speedy" | "";

export type BuildDeliveryPayloadInput = {
  courier: CheckoutCourier;
  deliveryType: CheckoutDeliveryType;
  city: string;
  officeOrPostcode: string;
  address?: string;
  deliveryNote?: string;
  selectedOffice?:
    | Pick<EcontOffice, "id" | "name" | "fullAddress" | "isAPS">
    | Pick<SpeedyOffice, "id" | "name" | "fullAddress" | "isAPS">
    | null;
};

export type CheckoutDeliveryPayload = {
  courier: string;
  deliveryType: "office" | "address";
  city: string;
  officeOrPostcode: string;
  details: string;
};

export function formatEcontAddressDeliveryDetails(
  address: string,
  deliveryNote?: string,
): string {
  const trimmedAddress = address.trim();
  const trimmedNote = deliveryNote?.trim() ?? "";

  if (!trimmedNote) {
    return trimmedAddress;
  }

  return `${trimmedAddress}\n${trimmedNote}`;
}

export function buildCheckoutDeliveryPayload(
  input: BuildDeliveryPayloadInput,
): CheckoutDeliveryPayload {
  const city = input.city.trim();
  const deliveryNote = input.deliveryNote?.trim() ?? "";
  const submittedDeliveryType =
    input.deliveryType === "automat" ? "office" : input.deliveryType;

  if (input.courier === "econt" && input.deliveryType === "address") {
    return {
      courier: "econt",
      deliveryType: "address",
      city,
      officeOrPostcode: "",
      details: formatEcontAddressDeliveryDetails(input.address ?? "", deliveryNote),
    };
  }

  if (input.courier === "econt" && input.deliveryType === "automat" && input.selectedOffice) {
    const officeLabel = formatEcontOfficeLabel(input.selectedOffice as EcontOffice);
    return {
      courier: "econt",
      deliveryType: "office",
      city,
      officeOrPostcode: officeLabel,
      details: deliveryNote
        ? `Автомат на Еконт: ${officeLabel}\n${deliveryNote}`
        : `Автомат на Еконт: ${officeLabel}`,
    };
  }

  if (input.courier === "econt" && input.deliveryType === "office") {
    const officeLabel = input.selectedOffice
      ? formatEcontOfficeLabel(input.selectedOffice as EcontOffice)
      : input.officeOrPostcode.trim();

    return {
      courier: "econt",
      deliveryType: "office",
      city,
      officeOrPostcode: officeLabel,
      details: deliveryNote,
    };
  }

  if (input.courier === "speedy" && input.deliveryType === "address") {
    return {
      courier: "speedy",
      deliveryType: "address",
      city,
      officeOrPostcode: input.officeOrPostcode.trim(),
      details: formatEcontAddressDeliveryDetails(input.address ?? "", deliveryNote),
    };
  }

  if (input.courier === "speedy" && input.deliveryType === "automat" && input.selectedOffice) {
    const officeLabel = formatSpeedyOfficeLabel(input.selectedOffice);
    const officeReference = `${officeLabel} (ID: ${input.selectedOffice.id})`;
    return {
      courier: "speedy",
      deliveryType: "office",
      city,
      officeOrPostcode: officeReference,
      details: deliveryNote
        ? `Автомат на Спиди: ${officeReference}\n${deliveryNote}`
        : `Автомат на Спиди: ${officeReference}`,
    };
  }

  if (input.courier === "speedy" && input.deliveryType === "office") {
    const officeLabel = input.selectedOffice
      ? `${formatSpeedyOfficeLabel(input.selectedOffice)} (ID: ${input.selectedOffice.id})`
      : input.officeOrPostcode.trim();

    return {
      courier: "speedy",
      deliveryType: "office",
      city,
      officeOrPostcode: officeLabel,
      details: deliveryNote,
    };
  }

  return {
    courier: input.courier,
    deliveryType: submittedDeliveryType,
    city,
    officeOrPostcode: input.officeOrPostcode.trim(),
    details:
      input.deliveryType === "address"
        ? formatEcontAddressDeliveryDetails(input.address ?? "", deliveryNote)
        : deliveryNote,
  };
}

export function validateDeliveryPayload(payload: CheckoutDeliveryPayload): string | null {
  if (payload.courier !== "econt" && payload.courier !== "speedy") {
    return "invalid_courier";
  }

  if (payload.deliveryType !== "office" && payload.deliveryType !== "address") {
    return "invalid_delivery_type";
  }

  if (payload.city.trim().length < 2) {
    return "invalid_city";
  }

  if (payload.deliveryType === "office" && payload.officeOrPostcode.trim().length < 2) {
    return "office_required";
  }

  if (payload.deliveryType === "address" && payload.details.trim().length < 5) {
    return "address_required";
  }

  return null;
}
