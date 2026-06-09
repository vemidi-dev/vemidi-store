import "server-only";

import { getRequestFingerprint } from "@/lib/request-fingerprint";
import { createServiceClient } from "@/lib/supabase/service";

export type SubscriptionActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const allowedTopics = new Set(["blog", "products", "events"]);

export async function subscribeToSelectedTopics(
  formData: FormData,
): Promise<SubscriptionActionState> {
  if (String(formData.get("website") ?? "").trim()) {
    return { status: "error", message: "Записването не беше прието." };
  }
  if (formData.get("privacy_consent") !== "on") {
    return {
      status: "error",
      message: "Необходимо е съгласие с политиката за поверителност.",
    };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Въведете валиден имейл адрес." };
  }

  const topics = [
    ...new Set(
      formData
        .getAll("topics")
        .map(String)
        .filter((topic) => allowedTopics.has(topic)),
    ),
  ];
  if (topics.length === 0) {
    return { status: "error", message: "Изберете поне една тема за известия." };
  }

  const supabase = createServiceClient();
  const clientKey = await getRequestFingerprint("topic-subscription");
  if (!supabase || !clientKey) {
    return {
      status: "error",
      message: "Абонаментът временно не е достъпен. Опитайте отново по-късно.",
    };
  }

  const { data: rateLimitAllowed, error: rateLimitError } = await supabase.rpc(
    "check_store_checkout_rate_limit",
    {
      p_client_key: clientKey,
      p_limit: 6,
      p_window_seconds: 3600,
    },
  );
  if (rateLimitError) {
    return {
      status: "error",
      message: "Абонаментът временно не може да бъде проверен.",
    };
  }
  if (rateLimitAllowed !== true) {
    return {
      status: "error",
      message: "Направени са твърде много опити. Опитайте отново по-късно.",
    };
  }

  const { error } = await supabase.rpc("subscribe_to_topics_server", {
    p_email: email,
    p_topics: topics,
  });
  if (error) {
    return {
      status: "error",
      message: error.message.includes("subscribe_to_topics_server")
        ? "Необходима е новата SQL настройка за защитени абонаменти."
        : "Не успяхме да запишем абонамента. Опитайте отново.",
    };
  }

  return {
    status: "success",
    message: "Готово. Предпочитанията Ви за известия са записани.",
  };
}
