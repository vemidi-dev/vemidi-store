import {
  resolveProductAvailability,
  type ProductFulfillmentInput,
} from "@/lib/product-fulfillment";

export const SCHEMA_ORG_AVAILABILITY = {
  InStock: "https://schema.org/InStock",
  OutOfStock: "https://schema.org/OutOfStock",
  PreOrder: "https://schema.org/PreOrder",
} as const;

export type SchemaOrgAvailabilityUrl =
  (typeof SCHEMA_ORG_AVAILABILITY)[keyof typeof SCHEMA_ORG_AVAILABILITY];

export function resolveSchemaOrgProductAvailability(
  input: ProductFulfillmentInput,
): SchemaOrgAvailabilityUrl {
  const availability = resolveProductAvailability(input);

  if (!availability.orderable) {
    return SCHEMA_ORG_AVAILABILITY.OutOfStock;
  }

  if (availability.fulfillmentType === "stocked") {
    return SCHEMA_ORG_AVAILABILITY.InStock;
  }

  return SCHEMA_ORG_AVAILABILITY.PreOrder;
}
