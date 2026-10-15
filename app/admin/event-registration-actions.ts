"use server";

import { revalidatePath } from "next/cache";

import { getString } from "@/lib/admin/form-data";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { EventRegistrationRow } from "@/lib/admin/types";

async function manageRegistration(formData: FormData, participant: boolean): Promise<{ ok: boolean; message: string; registration?: EventRegistrationRow }> {
  const id = getString(formData, "id");
  const status = getString(formData, "status");
  const indexText = getString(formData, "participant_index");
  if (participant && (!/^\d+$/.test(indexText) || Number(indexText) > 9)) return { ok: false, message: "Невалиден участник." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["new", "confirmed", "cancelled"].includes(status)) {
    return { ok: false, message: "Невалиден статус на записването." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Supabase не е конфигуриран." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията е изтекла. Влезте отново като администратор." };
  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) return { ok: false, message: "Нямате администраторски права." };

  const { data, error } = await supabase.rpc("manage_event_registration", {
    p_registration_id: id,
    p_status: status,
    p_participant_index: participant ? Number(indexText) : null,
  });

  if (error) {
    if (error.code === "PGRST202") return { ok: false, message: "Необходимо е да се изпълни миграцията event_participant_management.sql. Няма променени участници или места." };
    const message = error.message.includes("not_enough_spots")
      ? "Няма достатъчно свободни места за възстановяване на регистрацията."
      : error.message.includes("registration_not_found")
        ? "Регистрацията вече не съществува. Обновете списъка."
        : error.message.includes("admin_required")
          ? "Сесията няма администраторски права. Влезте отново."
          : `Статусът не беше обновен: ${error.message}`;
    return { ok: false, message };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/sabitiya");
  revalidatePath("/sabitiya/[slug]", "page");
  return { ok: true, registration: data as EventRegistrationRow, message: participant ? status === "cancelled" ? "Участието е отказано. Освободено е едно място." : "Участието е възстановено." : status === "cancelled" ? "Регистрацията е отказана. Местата са освободени." : "Статусът на регистрацията е обновен." };
}

export async function updateEventRegistrationStatus(formData: FormData) {
  return manageRegistration(formData, false);
}

export async function updateEventParticipantStatus(formData: FormData) {
  return manageRegistration(formData, true);
}
