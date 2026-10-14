"use server";

import { revalidatePath } from "next/cache";

import { getString } from "@/lib/admin/form-data";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function updateEventRegistrationStatus(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const id = getString(formData, "id");
  const status = getString(formData, "status");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !["new", "confirmed", "cancelled"].includes(status)) {
    return { ok: false, message: "Невалиден статус на записването." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Supabase не е конфигуриран." };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Сесията е изтекла. Влезте отново като администратор." };
  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) return { ok: false, message: "Нямате администраторски права." };

  const { error } = await supabase.rpc("update_event_registration_status", {
    p_registration_id: id,
    p_status: status,
  });

  if (error) {
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
  return { ok: true, message: status === "cancelled" ? "Регистрацията е отказана. Местата са освободени." : "Статусът на регистрацията е обновен." };
}
