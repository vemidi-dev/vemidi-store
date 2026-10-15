"use server";

import { revalidatePath } from "next/cache";

import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { sendEventRegistrationNotifications } from "@/lib/events/send-event-registration-notifications";
import { getResendConfig, sendEmail } from "@/lib/orders/send-order-notifications";
import { createServiceClient } from "@/lib/supabase/service";
import { getSiteUrl } from "@/lib/site-url";
import { parseEventRegistrationSettings, validateEventParticipants } from "@/lib/events/registration-config";
import { EVENT_PHONE_ERROR, isValidEventPhone } from "@/lib/events/phone";

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
  event_settings_changed: "Данните за работилницата са променени. Обновете страницата и проверете участниците и цената.",
  invalid_participants: "Проверете данните за всеки участник.",
  registration_cancelled: "Тази регистрация е отказана. Обновете страницата за ново записване.",
  invalid_registration: "Невалидна заявка за записване. Обновете страницата.",
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

  const submittedPhone = formData.get("phone");
  if (typeof submittedPhone !== "string" || !isValidEventPhone(submittedPhone)) {
    return { ok: false, message: EVENT_PHONE_ERROR };
  }

  const submittedEmail = formData.get("email");
  const customerEmail = typeof submittedEmail === "string" ? submittedEmail.trim() : "";
  if (!customerEmail) {
    return { ok: false, message: "Добавете имейл, на който да получите потвърждение за записването." };
  }
  if (customerEmail.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, message: errorMessages.invalid_email };
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

  const { data: targetEvent, error: eventError } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (eventError || !targetEvent) return { ok: false, message: errorMessages.event_not_found };
  const commonArgs = {
    p_event_id: eventId,
    p_full_name: text(formData, "full_name", 120),
    p_phone: submittedPhone.trim(),
    p_email: customerEmail,
    p_note: text(formData, "note", 1000) || null,
    p_idempotency_key: idempotencyKey,
  };
  let registrationResult;
  if (targetEvent.registration_settings !== undefined) {
    try {
      const raw = String(formData.get("participants") ?? "");
      const rawAnswers = String(formData.get("registration_answers") ?? "{}");
      if (!raw || raw.length > 150000 || rawAnswers.length > 20000) return { ok: false, message: "Добавете участниците. Ако формата е стара, обновете страницата." };
      const parsedSettings = parseEventRegistrationSettings(targetEvent.registration_settings);
      if (parsedSettings.error) return { ok: false, message: "Формата за тази работилница временно не е достъпна. Свържете се с нас." };
      const shownSettings = parseEventRegistrationSettings(JSON.parse(String(formData.get("expected_settings") ?? "null")));
      const shownPrice = formData.get("expected_price");
      if (shownSettings.error || JSON.stringify(shownSettings.settings) !== JSON.stringify(parsedSettings.settings) || shownPrice === null || (shownPrice === "" ? null : Number(shownPrice)) !== targetEvent.price) return { ok: false, message: errorMessages.event_settings_changed };
      const validated = validateEventParticipants(JSON.parse(raw), JSON.parse(rawAnswers), parsedSettings.settings, targetEvent.price);
      registrationResult = await supabase.rpc("register_for_event_v2", {
        ...commonArgs, p_participants: validated.participants, p_answers: validated.answers,
        p_expected_settings: targetEvent.registration_settings, p_expected_price: targetEvent.price,
      });
    } catch (error) {
      return { ok: false, message: error instanceof SyntaxError ? "Невалидни данни за участниците." : error instanceof Error ? error.message : "Проверете данните за участниците." };
    }
  } else {
    registrationResult = await supabase.rpc("register_for_event", { ...commonArgs, p_participant_count: participantCount });
  }
  const { data: registrationId, error } = registrationResult;

  if (error) {
    return { ok: false, message: mapRegistrationError(error.message) };
  }

  // Read the saved registration so retries use the original recipient and details.
  const { data: registration } = await supabase
    .from("event_registrations")
    .select("*")
    .eq("id", registrationId)
    .single();
  const { data: event } = await supabase
    .from("events")
    .select("title, slug, starts_at, location, address")
    .eq("id", registration?.event_id ?? eventId)
    .single();

  let customerEmailSent = false;
  if (event && registration && registration.status !== "cancelled") {
    const { adminTo } = getResendConfig();
    const results = await sendEventRegistrationNotifications(
      registration.id,
      {
        eventTitle: event.title,
        eventSlug: event.slug,
        eventStartsAt: event.starts_at,
        eventLocation: event.location,
        eventAddress: event.address,
        fullName: registration.full_name,
        phone: registration.phone,
        email: registration.email,
        participantCount: registration.participant_count,
        note: registration.note,
        participants: registration.participants,
        answers: registration.registration_answers,
        totalAmount: registration.total_amount,
      },
      { siteUrl: getSiteUrl(), adminTo, send: sendEmail },
    );
    customerEmailSent = results.customer.sent;
    for (const [channel, result] of Object.entries(results)) {
      if (!result.sent && result.error !== "no_customer_email") {
        console.error("Event registration email failed", { registrationId, channel, error: result.error });
      }
    }
  }

  revalidatePath("/sabitiya");
  revalidatePath(`/sabitiya/${eventSlug}`);
  revalidatePath("/admin");

  return {
    ok: true,
    message: "Записването е прието. Ще ви очакваме на място." + (
      customerEmailSent
        ? " Изпратихме потвърждение на вашия имейл."
        : (registration?.email || text(formData, "email", 160))
          ? " Потвърждението по имейл не беше изпратено. Регистрацията ви е запазена. При въпрос се свържете с нас."
          : ""
    ),
  };
}
