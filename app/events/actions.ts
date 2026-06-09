"use server";

import { revalidatePath } from "next/cache";

import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { createServiceClient } from "@/lib/supabase/service";

export type EventRegistrationState = {
  ok: boolean;
  message: string;
};

const errorMessages: Record<string, string> = {
  invalid_full_name: "Моля, въведете име и фамилия.",
  invalid_phone: "Моля, въведете валиден телефон.",
  invalid_email: "Имейл адресът не е валиден.",
  invalid_participant_count: "Изберете валиден брой участници.",
  event_not_found: "Събитието вече не е достъпно за записване.",
  event_has_started: "Записването за това събитие е приключило.",
  external_registration_only: "За това събитие се използва външният линк за записване.",
  registration_not_configured: "Онлайн записването за това събитие още не е активирано.",
  not_enough_spots: "Няма достатъчно свободни места за избрания брой участници.",
};

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

function mapRegistrationError(message: string) {
  const knownError = Object.entries(errorMessages).find(([code]) => message.includes(code));
  return knownError?.[1] ?? "Записването не беше изпратено. Моля, опитайте отново.";
}

export async function registerForEvent(
  _previousState: EventRegistrationState,
  formData: FormData,
): Promise<EventRegistrationState> {
  if (text(formData, "website", 200)) {
    return { ok: false, message: "Записването не беше прието." };
  }
  if (formData.get("privacy_consent") !== "on") {
    return {
      ok: false,
      message: "Необходимо е съгласие за обработване на данните за записването.",
    };
  }

  const eventId = text(formData, "event_id", 36);
  const eventSlug = text(formData, "event_slug", 160);
  const idempotencyKey = text(formData, "idempotency_key", 36);
  const participantCount = Number(text(formData, "participant_count", 2));
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(eventId) || !uuidPattern.test(idempotencyKey)) {
    return { ok: false, message: "Заявката за записване е невалидна. Презаредете страницата." };
  }

  const supabase = createServiceClient();
  const clientKey = await getRequestFingerprint("event-registration");
  if (!supabase || !clientKey) {
    return {
      ok: false,
      message: "Записването временно не е достъпно. Моля, свържете се с нас.",
    };
  }

  const { data: rateLimitAllowed, error: rateLimitError } = await supabase.rpc(
    "check_store_checkout_rate_limit",
    { p_client_key: clientKey, p_limit: 5, p_window_seconds: 900 },
  );
  if (rateLimitError) {
    return { ok: false, message: "Записването временно не може да бъде проверено." };
  }
  if (rateLimitAllowed !== true) {
    return { ok: false, message: "Направени са твърде много опити. Опитайте след 15 минути." };
  }

  const { error } = await supabase.rpc("register_for_event", {
    p_event_id: eventId,
    p_full_name: text(formData, "full_name", 120),
    p_phone: text(formData, "phone", 30),
    p_email: text(formData, "email", 160) || null,
    p_participant_count: participantCount,
    p_note: text(formData, "note", 1000) || null,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return { ok: false, message: mapRegistrationError(error.message) };
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventSlug}`);
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Записването е прието. Ще се свържем с вас за потвърждение.",
  };
}
