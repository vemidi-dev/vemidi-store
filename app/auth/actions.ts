"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getAuthValue(formData: FormData, key: "email" | "password") {
  return String(formData.get(key) ?? "").trim();
}

export async function login(formData: FormData) {
  const email = getAuthValue(formData, "email");
  const password = getAuthValue(formData, "password");

  if (!email || !password) {
    redirect("/login?message=Please provide both email and password.");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(
      "/login?message=Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  redirect("/account");
}

export async function signup(formData: FormData) {
  const email = getAuthValue(formData, "email");
  const password = getAuthValue(formData, "password");

  if (!email || !password) {
    redirect("/login?message=Please provide both email and password.");
  }

  const supabase = await createClient();
  if (!supabase) {
    redirect(
      "/login?message=Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message)}`);
  }

  if (!data.session) {
    redirect("/login?message=Check your email to confirm your account before signing in.");
  }

  redirect("/account");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}
