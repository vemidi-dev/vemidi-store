export type SmokeCheck = {
  path: string;
  label: string;
  allowedStatuses?: number[];
  bodyIncludes?: string[];
  bodyIncludesAny?: string[];
};

export const DEFAULT_SMOKE_CHECKS: SmokeCheck[] = [
  {
    path: "/",
    label: "Home",
    bodyIncludesAny: ["VeMiDi", "VeMiDi crafts"],
  },
  {
    path: "/produkti",
    label: "Catalog",
  },
  {
    path: "/categorii",
    label: "Categories",
  },
  {
    path: "/checkout",
    label: "Checkout",
  },
  {
    path: "/robots.txt",
    label: "robots.txt",
    bodyIncludes: ["sitemap"],
  },
  {
    path: "/sitemap.xml",
    label: "sitemap.xml",
    bodyIncludesAny: ["vemidi-crafts.com", "urlset", "<urlset"],
  },
];

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Base URL is required.");
  }

  const candidate = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
  const url = new URL(candidate);
  return url.origin;
}

export function buildSmokeUrl(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeBaseUrl(baseUrl)}${normalizedPath}`;
}

export function parseSmokePaths(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function resolveSmokeBaseUrl(
  argv: string[],
  env: Record<string, string | undefined> = process.env,
): string | null {
  const fromArg = argv
    .find((entry) => entry.startsWith("--base-url="))
    ?.slice("--base-url=".length)
    .trim();
  const fromEnv = env.BASE_URL?.trim();
  const value = fromArg || fromEnv;

  if (!value) {
    return null;
  }

  return normalizeBaseUrl(value);
}

export function buildSmokeChecks(extraPaths: string[] = []): SmokeCheck[] {
  const checks = [...DEFAULT_SMOKE_CHECKS];
  const knownPaths = new Set(checks.map((check) => check.path));

  for (const path of extraPaths) {
    if (knownPaths.has(path)) {
      continue;
    }

    checks.push({
      path,
      label: `Custom ${path}`,
    });
    knownPaths.add(path);
  }

  return checks;
}

export function evaluateSmokeCheck(
  check: SmokeCheck,
  status: number,
  body: string,
): { ok: boolean; detail: string } {
  if (status >= 500) {
    return { ok: false, detail: `status ${status} (server error)` };
  }

  const allowedStatuses = check.allowedStatuses ?? [200];
  if (!allowedStatuses.includes(status)) {
    return {
      ok: false,
      detail: `status ${status}, expected ${allowedStatuses.join("|")}`,
    };
  }

  if (check.bodyIncludes) {
    for (const needle of check.bodyIncludes) {
      if (!body.includes(needle)) {
        return { ok: false, detail: `missing body text "${needle}"` };
      }
    }
  }

  if (check.bodyIncludesAny) {
    const matched = check.bodyIncludesAny.some((needle) => body.includes(needle));
    if (!matched) {
      return {
        ok: false,
        detail: `missing any of: ${check.bodyIncludesAny.join(", ")}`,
      };
    }
  }

  return { ok: true, detail: `status ${status}` };
}

export function formatSmokeResultLine(
  url: string,
  result: { ok: boolean; detail: string },
): string {
  return result.ok ? `[PASS] ${url} (${result.detail})` : `[FAIL] ${url} (${result.detail})`;
}
