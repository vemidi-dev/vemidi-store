"use server";

import { revalidatePath } from "next/cache";

import type { OrderRow } from "@/lib/admin/orders";
import {
  normalizeCampaignCode,
  resolveOrderAttributionFromLines,
} from "@/lib/campaign-attribution";
import {
  checkoutErrorMessages,
  mapCheckoutError,
} from "@/lib/checkout/errors";
import { formatOrderReference } from "@/lib/checkout/order-confirmation";
import {
  validatePersonalizationFields,
  type PersonalizationFieldDefinition,
} from "@/lib/checkout-personalization";
import type { ProductOptionGroup } from "@/lib/product-options";
import { validateProductOptionSelections } from "@/lib/product-option-validation";
import { mapProductOptionGroups } from "@/lib/storefront/option-groups";
import { sendOrderNotifications } from "@/lib/orders/send-order-notifications";
import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { isUuid } from "@/lib/is-uuid";
import { createServiceClient } from "@/lib/supabase/service";

export type CheckoutActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<
    Record<"customer_name" | "customer_phone" | "customer_email", string>
  >;
  purchase?: {
    value: number;
    currency: string;
    itemCount: number;
  };
  confirmation?: {
    orderRef: string;
  };
};

type SubmittedCartItem = {
  productId?: unknown;
  slug?: unknown;
  title?: unknown;
  quantity?: unknown;
  personalization?: unknown;
  personalizationFields?: unknown;
  selectedColors?: unknown;
  optionSelections?: unknown;
  price?: unknown;
  campaign?: unknown;
  source?: unknown;
  landingUrl?: unknown;
};

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function parseCartItems(raw: string): SubmittedCartItem[] | null {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as SubmittedCartItem[]) : null;
  } catch {
    return null;
  }
}

export async function createStoreOrder(
  _previousState: CheckoutActionState,
  formData: FormData,
): Promise<CheckoutActionState> {
  if (text(formData, "website", 200)) {
    return { ok: false, message: "Поръчката не беше приета." };
  }

  if (formData.get("privacy_consent") !== "on") {
    return {
      ok: false,
      message: "Необходимо е съгласие за обработване на данните за поръчката.",
    };
  }

  const items = parseCartItems(String(formData.get("cart_items") ?? ""));
  if (!items?.length) {
    return { ok: false, message: "Количката е празна или данните са невалидни." };
  }

  const idempotencyKey = text(formData, "idempotency_key", 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    return { ok: false, message: checkoutErrorMessages.invalid_idempotency_key };
  }

  const customer = {
    name: text(formData, "customer_name", 120),
    phone: text(formData, "customer_phone", 30),
    email: text(formData, "customer_email", 160),
  };

  if (customer.name.length < 2) {
    return {
      ok: false,
      message: checkoutErrorMessages.invalid_customer_name,
      fieldErrors: {
        customer_name: checkoutErrorMessages.invalid_customer_name,
      },
    };
  }

  if (customer.phone.length < 6) {
    return {
      ok: false,
      message: checkoutErrorMessages.invalid_customer_phone,
      fieldErrors: {
        customer_phone: checkoutErrorMessages.invalid_customer_phone,
      },
    };
  }

  if (
    customer.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)
  ) {
    return {
      ok: false,
      message: checkoutErrorMessages.invalid_customer_email,
      fieldErrors: {
        customer_email: checkoutErrorMessages.invalid_customer_email,
      },
    };
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return {
      ok: false,
      message: "Магазинът временно не може да приема поръчки. Липсва защитената сървърна настройка.",
    };
  }

  const clientKey = await getRequestFingerprint("store-checkout");
  if (!clientKey) {
    return {
      ok: false,
      message: "Магазинът временно не може да приеме поръчката. Липсва защитена настройка.",
    };
  }

  const { data: rateLimitAllowed, error: rateLimitError } = await supabase.rpc(
    "check_store_checkout_rate_limit",
    {
      p_client_key: clientKey,
      p_limit: 8,
      p_window_seconds: 900,
    },
  );

  if (rateLimitError) {
    return {
      ok: false,
      message: "Магазинът временно не може да провери заявката. Моля, опитайте отново.",
    };
  }

  if (rateLimitAllowed !== true) {
    return { ok: false, message: checkoutErrorMessages.rate_limit_exceeded };
  }

  const resolveSubmittedProductId = (item: SubmittedCartItem) => {
    if (typeof item.productId === "string" && isUuid(item.productId)) {
      return item.productId;
    }
    if (typeof item.slug === "string" && isUuid(item.slug)) {
      return item.slug;
    }
    return "";
  };

  const productIds = Array.from(
    new Set(items.map(resolveSubmittedProductId).filter(Boolean)),
  );
  if (productIds.length === 0) {
    return { ok: false, message: checkoutErrorMessages.invalid_order_item };
  }

  const [
    { data: fieldRows, error: fieldError },
    { data: optionGroupRows, error: optionGroupError },
  ] = await Promise.all([
    supabase
      .from("product_personalization_fields")
      .select("id,product_id,label,field_key,field_type,max_length,is_required")
      .in("product_id", productIds),
    supabase
      .from("product_option_groups")
      .select(
        "id,product_id,name,key,input_type,is_required,min_select,max_select,sort_order,is_active,pricing_mode,depends_on_option_id,placeholder,max_length,text_price_delta",
      )
      .in("product_id", productIds)
      .eq("is_active", true),
  ]);

  if (fieldError || optionGroupError) {
    return {
      ok: false,
      message: "Магазинът временно не може да провери персонализацията.",
    };
  }

  const optionGroupIds = (optionGroupRows ?? []).map((group) => String(group.id));
  const { data: optionValueRows, error: optionValueError } =
    optionGroupIds.length > 0
      ? await supabase
          .from("product_option_values")
          .select(
            "id,group_id,label,key,price_delta,is_default,is_active,is_sold_out,sku,sort_order",
          )
          .in("group_id", optionGroupIds)
          .eq("is_active", true)
      : { data: [], error: null };

  if (optionValueError) {
    return {
      ok: false,
      message: "Магазинът временно не може да провери продуктовите опции.",
    };
  }

  const fieldsByProduct = new Map<string, PersonalizationFieldDefinition[]>();
  ((fieldRows ?? []) as PersonalizationFieldDefinition[]).forEach((field) => {
    const definitions = fieldsByProduct.get(field.product_id) ?? [];
    definitions.push(field);
    fieldsByProduct.set(field.product_id, definitions);
  });

  const optionGroupsByProduct = new Map<string, ProductOptionGroup[]>();
  const groupsByProductId = new Map<string, typeof optionGroupRows>();
  (optionGroupRows ?? []).forEach((group) => {
    const productId = String(group.product_id);
    const rows = groupsByProductId.get(productId) ?? [];
    rows.push(group);
    groupsByProductId.set(productId, rows);
  });
  productIds.forEach((productId) => {
    const groups = groupsByProductId.get(productId) ?? [];
    const groupIds = new Set(groups.map((group) => String(group.id)));
    const values = (optionValueRows ?? []).filter((value) =>
      groupIds.has(String(value.group_id)),
    );
    optionGroupsByProduct.set(
      productId,
      mapProductOptionGroups(groups, values),
    );
  });

  const delivery = {
    courier: text(formData, "courier", 20),
    type: text(formData, "delivery_type", 20),
    city: text(formData, "city", 120),
    officeOrPostcode: text(formData, "office_or_postcode", 200),
    details: text(formData, "delivery_details", 500),
  };

  const rpcItems = [];
  const campaigns = new Set<string>();
  for (const item of items) {
    const productId = resolveSubmittedProductId(item);
    const definitions = fieldsByProduct.get(productId) ?? [];
    const validated = validatePersonalizationFields(
      item.personalizationFields,
      definitions,
    );

    if (!validated.ok) {
      return {
        ok: false,
        message: checkoutErrorMessages[validated.code],
      };
    }

    const optionGroups = optionGroupsByProduct.get(productId) ?? [];
    const optionValidated = validateProductOptionSelections(
      productId,
      optionGroups,
      item.optionSelections,
    );
    if (!optionValidated.ok) {
      const productTitle =
        typeof item.title === "string" && item.title.trim()
          ? item.title.trim().slice(0, 160)
          : "продукта";
      return {
        ok: false,
        message: `Проверете избраните опции за „${productTitle}“: ${
          checkoutErrorMessages[optionValidated.code] ?? optionValidated.message
        } Върнете се в количката и отворете продукта отново.`,
      };
    }

    const legacyPersonalization =
      definitions.length === 0 && typeof item.personalization === "string"
        ? item.personalization.trim().slice(0, 1000) || null
        : null;

    const campaign = normalizeCampaignCode(item.campaign);
    if (campaign) {
      campaigns.add(campaign);
    }

    rpcItems.push({
      productId,
      quantity: typeof item.quantity === "number" ? item.quantity : 0,
      personalization: validated.summary ?? legacyPersonalization,
      personalizationFields: validated.fields,
      selectedColors: Array.isArray(item.selectedColors) ? item.selectedColors : [],
      optionSelections: optionValidated.selections,
    });
  }

  const orderAttribution = resolveOrderAttributionFromLines(
    items.map((item) => ({
      campaign: normalizeCampaignCode(item.campaign),
      source: typeof item.source === "string" ? item.source : undefined,
      landingUrl: typeof item.landingUrl === "string" ? item.landingUrl : undefined,
    })),
  );

  const rpcPayload: Record<string, unknown> = {
    p_customer: customer,
    p_delivery: delivery,
    p_items: rpcItems,
    p_note:
      [
        campaigns.size ? `Кампания: ${Array.from(campaigns).join(", ")}` : "",
        text(formData, "note", 900),
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 1000) || null,
    p_idempotency_key: idempotencyKey,
  };

  if (orderAttribution) {
    rpcPayload.p_attribution = {
      source: orderAttribution.source,
      campaign: orderAttribution.campaign ?? null,
      landingUrl: orderAttribution.landingUrl ?? null,
    };
  }

  const { data, error } = await supabase.rpc("create_store_order", rpcPayload);

  if (error) {
    console.error("Store checkout RPC failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
      itemCount: rpcItems.length,
      hasAttribution: Boolean(orderAttribution),
    });
    return { ok: false, message: mapCheckoutError(error.message) };
  }

  if (typeof data !== "string" || !data) {
    return { ok: false, message: "Поръчката беше изпратена, но липсва номер за потвърждение." };
  }

  const { data: createdOrder } = await supabase
    .from("orders")
    .select(
      "id,created_at,status,product_name,kit_name,kit_size,coloring,personalization,child_name,total_price,currency,customer_name,customer_phone,customer_email,courier,delivery_type,city,delivery_details,office_id,office_name,office_address,payment_method,note,raw_payload",
    )
    .eq("id", data)
    .maybeSingle();

  if (createdOrder) {
    try {
      await sendOrderNotifications(createdOrder as OrderRow);
    } catch (error) {
      console.error("Order notification dispatch failed", {
        orderId: data,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Поръчката е приета успешно.",
    confirmation: {
      orderRef: formatOrderReference(data),
    },
    purchase: {
      value: Number(createdOrder?.total_price) || 0,
      currency: String(createdOrder?.currency || "EUR"),
      itemCount: rpcItems.reduce((total, item) => total + item.quantity, 0),
    },
  };
}
