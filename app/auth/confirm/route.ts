import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/admin/update-password";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const supabase = await createClient();

  if (!supabase) {
    return NextResponse.redirect(
      new URL("/admin/reset-password?error=Supabase не е конфигуриран.", request.url),
    );
  }

  let error: { message: string } | null = null;

  if (tokenHash && type) {
    const result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    error = result.error;
  } else if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else {
    error = { message: "Линкът за възстановяване е непълен." };
  }

  if (error) {
    const url = new URL("/admin/reset-password", request.url);
    url.searchParams.set("error", error.message);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
