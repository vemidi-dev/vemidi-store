"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim();
}

async function getSiteOrigin() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return origin.replace(/\/$/, "");
  }

  const host = requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  return host ? `${protocol}://${host}` : "http://localhost:3000";
}

export async function requestAdminPasswordReset(formData: FormData) {
  const email = getEmail(formData);
  if (!email) {
    redirect("/admin/reset-password?error=Въведете имейл адрес.");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect("/admin/reset-password?error=Supabase не е конфигуриран.");
  }

  const origin = await getSiteOrigin();
  const callbackUrl = `${origin}/auth/confirm?next=${encodeURIComponent(
    "/admin/update-password",
  )}`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl,
  });

  if (error) {
    redirect(`/admin/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    "/admin/reset-password?success=Ако профилът съществува, изпратихме имейл за нова парола.",
  );
}
