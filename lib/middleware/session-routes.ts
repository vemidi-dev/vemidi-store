const SESSION_ROUTE_PREFIXES = ["/admin", "/account", "/auth"] as const;

export function shouldRefreshSupabaseSession(pathname: string): boolean {
  return SESSION_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const sessionMiddlewareMatcher = [
  "/admin/:path*",
  "/account",
  "/account/:path*",
  "/auth/:path*",
];
