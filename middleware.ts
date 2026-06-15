import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { shouldRefreshSupabaseSession } from "@/lib/middleware/session-routes";
import {
  resolveSeoRedirectUrl,
  SEO_REDIRECT_STATUS,
} from "@/lib/seo/middleware-redirects";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // SEO redirects: GET/HEAD only — never mutate POST/PUT/PATCH/DELETE.
  const seoTarget = resolveSeoRedirectUrl(request);
  if (seoTarget) {
    return NextResponse.redirect(seoTarget, SEO_REDIRECT_STATUS);
  }

  if (!shouldRefreshSupabaseSession(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/products",
    "/shop",
    "/categories/:path*",
    "/occasions/:path*",
    "/admin/:path*",
    "/account",
    "/account/:path*",
    "/auth/:path*",
  ],
};
