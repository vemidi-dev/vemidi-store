"use server";

import { revalidatePath } from "next/cache";

import {
  validatePersonalizationFields,
  type PersonalizationFieldDefinition,
} from "@/lib/checkout-personalization";
import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { createServiceClient } from "@/lib/supabase/service";

export type CheckoutActionState = {
  ok: boolean;
  message: string;
  purchase?: {
    value: number;
    currency: string;
    itemCount: number;
  };
};

type SubmittedCartItem = {
  slug?: unknown;
  quantity?: unknown;
  personalization?: unknown;
  personalizationFields?: unknown;
  selectedColors?: unknown;
};

const checkoutErrorMessages: Record<string, string> = {
  invalid_customer_name: "Моля, въведете име и фамилия.",
  invalid_customer_phone: "Моля, въведете валиден телефон.",
  invalid_customer_email: "Имейл адресът не е валиден.",
  invalid_courier: "Изберете куриер.",
  invalid_delivery_type: "Изберете начин на доставка.",
  invalid_city: "Въведете населено място.",
  office_required: "Въведете офис на куриера.",
  address_required: "Въведете пълен адрес за доставка.",
  empty_order: "Количката е празна.",
  too_many_items: "Поръчката съдържа твърде много артикули.",
  invalid_order_item: "В количката има невалиден артикул.",
  invalid_quantity: "В количката има невалидно количество.",
  product_not_found: "Някой от продуктите вече не е наличен.",
  product_sold_out: "Някой от продуктите в количката е изчерпан.",
  invalid_product_price: "Цената на продукт не може да бъде потвърдена.",
  personalization_too_long: "Текстът за персонализация е твърде дълъг.",
  invalid_personalization_fields: "Данните за персонализация са невалидни.",
  required_personalization_missing: "Попълнете всички задължителни полета за персонализация.",
  invalid_personalization_date: "Въведете валидна дата в полето за персонализация.",
  product_not_customizable: "Избран продукт не поддържа персонализация.",
  invalid_color_count: "Изберете необходимия брой цветове за продукта.",
  invalid_color_selection: "Някой от избраните цветове вече не е наличен.",
  invalid_idempotency_key: "Заявката за поръчка е невалидна. Презаредете страницата и опитайте отново.",
  order_request_in_progress: "Поръчката вече се обработва. Изчакайте момент и опитайте отново.",
  rate_limit_exceeded: "Направени са твърде много опити. Изчакайте 15 минути и опитайте отново.",
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

function mapCheckoutError(message: string) {
  const knownError = Object.entries(checkoutErrorMessages).find(([code]) =>
    message.includes(code),
  );

  return knownError?.[1] ?? "Поръчката не беше записана. Моля, опитайте отново.";
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

  const productIds = Array.from(
    new Set(
      items.flatMap((item) =>
        typeof item.slug === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          item.slug,
        )
          ? [item.slug]
          : [],
      ),
    ),
  );
  if (productIds.length === 0) {
    return { ok: false, message: checkoutErrorMessages.invalid_order_item };
  }

  const { data: fieldRows, error: fieldError } = await supabase
    .from("product_personalization_fields")
    .select("id,product_id,label,field_key,field_type,max_length,is_required")
    .in("product_id", productIds);

  if (fieldError) {
    return {
      ok: false,
      message: "Магазинът временно не може да провери персонализацията.",
    };
  }

  const fieldsByProduct = new Map<string, PersonalizationFieldDefinition[]>();
  ((fieldRows ?? []) as PersonalizationFieldDefinition[]).forEach((field) => {
    const definitions = fieldsByProduct.get(field.product_id) ?? [];
    definitions.push(field);
    fieldsByProduct.set(field.product_id, definitions);
  });

  const customer = {
    name: text(formData, "customer_name", 120),
    phone: text(formData, "customer_phone", 30),
    email: text(formData, "customer_email", 160),
  };
  const delivery = {
    courier: text(formData, "courier", 20),
    type: text(formData, "delivery_type", 20),
    city: text(formData, "city", 120),
    officeOrPostcode: text(formData, "office_or_postcode", 200),
    details: text(formData, "delivery_details", 500),
  };

  const rpcItems = [];
  for (const item of items) {
    const productId = typeof item.slug === "string" ? item.slug : "";
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

    const legacyPersonalization =
      definitions.length === 0 && typeof item.personalization === "string"
        ? item.personalization.trim().slice(0, 1000) || null
        : null;

    rpcItems.push({
      productId,
      quantity: typeof item.quantity === "number" ? item.quantity : 0,
      personalization: validated.summary ?? legacyPersonalization,
      personalizationFields: validated.fields,
      selectedColors: Array.isArray(item.selectedColors) ? item.selectedColors : [],
    });
  }

  const { data, error } = await supabase.rpc("create_store_order", {
    p_customer: customer,
    p_delivery: delivery,
    p_items: rpcItems,
    p_note: text(formData, "note", 1000) || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return { ok: false, message: mapCheckoutError(error.message) };
  }

  if (typeof data !== "string" || !data) {
    return { ok: false, message: "Поръчката беше изпратена, но липсва номер за потвърждение." };
  }

  const { data: createdOrder } = await supabase
    .from("orders")
    .select("total_price,currency")
    .eq("id", data)
    .maybeSingle();

  revalidatePath("/admin");

  return {
    ok: true,
    message: "Поръчката е приета успешно.",
    purchase: {
      value: Number(createdOrder?.total_price) || 0,
      currency: String(createdOrder?.currency || "EUR"),
      itemCount: rpcItems.reduce((total, item) => total + item.quantity, 0),
    },
  };
}
