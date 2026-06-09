"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SUBSCRIPTION_TOPICS } from "@/lib/admin/subscriptions";
import type { SubscriptionTopic } from "@/lib/admin/types";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

const ADMIN_SUBSCRIBERS_PATH = "/admin?tab=subscribers";
const allowedTopics = new Set<SubscriptionTopic>(
  SUBSCRIPTION_TOPICS.map((topic) => topic.value),
);

function redirectWith(kind: "success" | "error", message: string): never {
  const params = new URLSearchParams({ tab: "subscribers", [kind]: message });
  redirect(`/admin?${params.toString()}`);
}

async function getAuthorizedClient() {
  const supabase = await createClient();
  if (!supabase) {
    redirectWith("error", "Supabase не е конфигуриран.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Моля, влезте като администратор.")}`,
    );
  }

  const { isAdmin, error } = await checkIsAdmin(supabase, user.id);
  if (error || !isAdmin) {
    redirect(
      `/admin/login?message=${encodeURIComponent("Профилът няма админ права.")}`,
    );
  }

  return supabase;
}

export async function updateSubscriber(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = String(formData.get("id") ?? "").trim();
  const topics = [
    ...new Set(
      formData
        .getAll("topics")
        .map(String)
        .filter((topic): topic is SubscriptionTopic =>
          allowedTopics.has(topic as SubscriptionTopic),
        ),
    ),
  ];
  const isActive = formData.get("is_active") === "on";

  if (!id) {
    redirectWith("error", "Липсва абонат за редакция.");
  }
  if (topics.length === 0) {
    redirectWith("error", "Изберете поне една тема за абоната.");
  }

  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      topics,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirectWith(
      "error",
      error.message.includes("permission denied")
        ? "Липсват администраторските права за абонаментите в Supabase."
        : `Абонаментът не беше обновен: ${error.message}`,
    );
  }

  revalidatePath(ADMIN_SUBSCRIBERS_PATH);
  redirectWith("success", "Предпочитанията на абоната са обновени.");
}
