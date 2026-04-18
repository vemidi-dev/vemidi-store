import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type AdminCheckResult = {
  isAdmin: boolean;
  error: PostgrestError | null;
};

export async function checkIsAdmin(
  supabase: SupabaseClient,
  userId: string,
): Promise<AdminCheckResult> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { isAdmin: false, error };
  }

  return { isAdmin: Boolean(data), error: null };
}
