"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getString } from "@/lib/admin/form-data";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

export async function updateEventRegistrationStatus(formData: FormData) {
  const id = getString(formData, "id");
  const status = getString(formData, "status");
  if (!id || !["new", "confirmed", "cancelled"].includes(status)) {
    redirect("/admin?tab=events&error=Невалиден статус на записването.");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/admin?tab=events&error=Supabase не е конфигуриран.");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) redirect("/admin/login");

  const { error } = await supabase.rpc("update_event_registration_status", {
    p_registration_id: id,
    p_status: status,
  });

  if (error) {
    redirect(`/admin?tab=events&error=${encodeURIComponent(`Статусът не беше обновен: ${error.message}`)}`);
  }

  revalidatePath("/admin");
  redirect("/admin?tab=events&success=Статусът на записването е обновен.");
}
