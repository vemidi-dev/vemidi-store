import {
  BLOCKED_HANDOFF_QUERY_KEYS,
  parseCampaignHandoffQuery,
  type CampaignHandoffQuery,
} from "@/lib/campaign-handoff";

export const CAMPAIGN_HANDOFF_POST_CONTENT_TYPE =
  "application/x-www-form-urlencoded";

export const CAMPAIGN_HANDOFF_MAX_BODY_BYTES = 4096;

export const BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY =
  "field_e0bd392877ce4fa2841f3c81ac0b21db";

export const ALLOWED_CAMPAIGN_POST_FIELDS = new Set([
  "product",
  "campaign",
  "source",
  "landing",
  "quantity",
  "option_razmer_na_komplekta",
  "option_coloring",
  `pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`,
]);

const DEFAULT_PRODUCTION_ORIGIN = "https://special.vemidi-crafts.com";

export type CampaignPostParseResult =
  | { ok: true; query: CampaignHandoffQuery; fields: Record<string, string> }
  | { ok: false; status: number; error: string };

export function getCampaignHandoffAllowedOrigins() {
  const configured = (process.env.CAMPAIGN_HANDOFF_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const origins = new Set<string>([DEFAULT_PRODUCTION_ORIGIN, ...configured]);
  return origins;
}

export function resolveCampaignHandoffOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return origin;
  }

  const referer = request.headers.get("referer")?.trim();
  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function isAllowedCampaignHandoffOrigin(origin: string | null) {
  if (!origin) {
    return false;
  }

  return getCampaignHandoffAllowedOrigins().has(origin);
}

export function buildCampaignHandoffCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !isAllowedCampaignHandoffOrigin(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function normalizePostFieldKey(key: string) {
  return key.trim();
}

export function parseCampaignHandoffPostBody(
  body: URLSearchParams,
): CampaignPostParseResult {
  const fields: Record<string, string> = {};

  for (const [rawKey, rawValue] of body.entries()) {
    const key = normalizePostFieldKey(rawKey);
    const value = String(rawValue ?? "").trim();

    if (!key) {
      continue;
    }

    const normalizedKey = key.toLowerCase();

    if (BLOCKED_HANDOFF_QUERY_KEYS.has(normalizedKey)) {
      return {
        ok: false,
        status: 400,
        error: "Непозволени параметри в заявката.",
      };
    }

    if (!ALLOWED_CAMPAIGN_POST_FIELDS.has(key)) {
      return {
        ok: false,
        status: 400,
        error: "Непозволено поле в заявката.",
      };
    }

    if (fields[key]) {
      return {
        ok: false,
        status: 400,
        error: "Дублирано поле в заявката.",
      };
    }

    if (!value) {
      continue;
    }

    fields[key] = value;
  }

  const query = parseCampaignHandoffQuery(fields);

  if (query.unknownKeys.length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Невалидна конфигурация на продукта.",
    };
  }

  return { ok: true, query, fields };
}

export function handoffQueryFromStoredFields(fields: Record<string, string>) {
  return parseCampaignHandoffQuery(fields);
}
