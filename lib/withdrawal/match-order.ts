import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeWithdrawalPhone,
} from "@/lib/withdrawal/validation";

type OrderContactRow = {
  id: string;
  customer_email: string | null;
  customer_phone: string | null;
};

function normalizeOrderNumberRef(value: string) {
  return value.replace(/[^a-fA-F0-9]/g, "").slice(0, 8).toLowerCase();
}

function contactsMatch(
  order: OrderContactRow,
  contactEmail: string | null,
  contactPhone: string | null,
) {
  const emailMatch =
    contactEmail &&
    order.customer_email?.trim().toLowerCase() === contactEmail.trim().toLowerCase();
  const phoneMatch =
    contactPhone &&
    normalizeWithdrawalPhone(order.customer_phone ?? "") ===
      normalizeWithdrawalPhone(contactPhone);

  if (contactEmail && contactPhone) {
    return Boolean(emailMatch || phoneMatch);
  }
  if (contactEmail) {
    return Boolean(emailMatch);
  }
  if (contactPhone) {
    return Boolean(phoneMatch);
  }

  return false;
}

export async function resolveWithdrawalOrderId(
  supabase: SupabaseClient,
  {
    orderNumber,
    contactEmail,
    contactPhone,
  }: {
    orderNumber: string;
    contactEmail: string | null;
    contactPhone: string | null;
  },
): Promise<string | null> {
  const ref = normalizeOrderNumberRef(orderNumber);
  if (ref.length < 4) {
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, customer_email, customer_phone")
    .ilike("id", `${ref}%`)
    .limit(3);

  if (error || !data?.length) {
    return null;
  }

  const matches = (data as OrderContactRow[]).filter((order) =>
    contactsMatch(order, contactEmail, contactPhone),
  );

  if (matches.length !== 1) {
    return null;
  }

  return matches[0].id;
}
