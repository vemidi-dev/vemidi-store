import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { shouldRefreshSupabaseSession } from "@/lib/middleware/session-routes";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (!shouldRefreshSupabaseSession(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account",
    "/account/:path*",
    "/auth/:path*",
  ],
};
