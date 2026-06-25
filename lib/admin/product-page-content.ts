import { adminFormFields } from "@/lib/admin/form-fields";
import { getOptionalString } from "@/lib/admin/form-data";

export type ProductPageContentPayload = {
  personalizationInfo: string | null;
  dimensionsMaterials: string | null;
  orderingInfo: string | null;
};

export type ProductPageContentFormDefaults = {
  personalization_info: string;
  dimensions_materials: string;
  ordering_info: string;
};

type ProductPageContentSource = {
  personalization_info?: string | null;
  dimensions_materials?: string | null;
  ordering_info?: string | null;
};

export function getProductPageContentFormDefaults(
  product?: ProductPageContentSource | null,
): ProductPageContentFormDefaults {
  return {
    personalization_info: product?.personalization_info ?? "",
    dimensions_materials: product?.dimensions_materials ?? "",
    ordering_info: product?.ordering_info ?? "",
  };
}

export function parseProductPageContentFromFormData(formData: FormData): {
  payload: ProductPageContentPayload;
  error: string | null;
} {
  return {
    payload: {
      personalizationInfo: getOptionalString(
        formData,
        adminFormFields.product.personalizationInfo,
      ),
      dimensionsMaterials: getOptionalString(
        formData,
        adminFormFields.product.dimensionsMaterials,
      ),
      orderingInfo: getOptionalString(formData, adminFormFields.product.orderingInfo),
    },
    error: null,
  };
}
