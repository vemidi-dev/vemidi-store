"use server";

import { createClient } from "@/lib/supabase/server";

export type EventNotificationState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function subscribeToEventNotifications(
  _previousState: EventNotificationState,
  formData: FormData,
): Promise<EventNotificationState> {
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
  const allowedTopics = new Set(["blog", "products", "events"]);
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

  const supabase = await createClient();
  if (!supabase) {
    return {
      status: "error",
      message: "Абонаментът временно не е достъпен. Опитайте отново по-късно.",
    };
  }

  const { error } = await supabase.rpc("subscribe_to_topics", {
    p_email: email,
    p_topics: topics,
  });

  if (error) {
    return {
      status: "error",
      message: error.message.includes("subscribe_to_topics")
        ? "Необходима е еднократна настройка на абонамента в Supabase."
        : "Не успяхме да запишем имейла. Опитайте отново.",
    };
  }

  return {
    status: "success",
    message: "Готово. Ще Ви изпратим имейл, когато обявим нова работилница.",
  };
}
