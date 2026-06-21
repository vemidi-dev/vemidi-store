import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY } from "@/lib/campaign-handoff-post";
import { CROSS_HANDOFF_COOKIE_MAX_AGE_SECONDS } from "@/lib/campaign-cross-handoff-cookie-config";

export const CROSS_HANDOFF_VERSION = 2 as const;
export const CROSS_HANDOFF_DIRECTION = "store-to-landing" as const;
export const BUTTERFLY_CAMPAIGN_CODE = "butterflies";

export const CROSS_HANDOFF_SIZE_VALUE_TO_LANDING = {
  komplekt_mini_1_peperuda_2_vodni_koncheta: "3",
  komplekt_standart_2_peperuda_3_vodni_koncheta: "5",
  komplekt_maksi_3_peperuda_4_vodni_koncheta: "7",
} as const;

export const CROSS_HANDOFF_LANDING_SIZE_VALUES = new Set(["3", "5", "7"]);
export const CROSS_HANDOFF_LANDING_COLORING_VALUES = new Set(["paints", "markers"]);

export const CROSS_HANDOFF_PERSONALIZATION_POST_KEY = `pf_${BUTTERFLY_LEGACY_PERSONALIZATION_FIELD_KEY}`;

export const ALLOWED_CROSS_HANDOFF_FIELD_KEYS = new Set([
  "option_razmer_na_komplekta",
  "option_coloring",
  CROSS_HANDOFF_PERSONALIZATION_POST_KEY,
]);

export type CrossHandoffPayload = {
  v: typeof CROSS_HANDOFF_VERSION;
  dir: typeof CROSS_HANDOFF_DIRECTION;
  iat: number;
  exp: number;
  jti: string;
  productId: string;
  landingSlug: string;
  campaign: string;
  fields: Record<string, string>;
};

export type CrossHandoffFormState = {
  size: string;
  coloring: string;
  personalize: boolean;
  personalizationName: string;
};

export type CrossHandoffOpenResult =
  | { ok: true; payload: CrossHandoffPayload }
  | {
      ok: false;
      reason:
        | "missing_secret"
        | "invalid"
        | "expired"
        | "tampered"
        | "wrong_version"
        | "wrong_direction";
    };

function deriveCrossHandoffKey(secret: string) {
  return createHash("sha256")
    .update(`campaign-handoff:v2:${CROSS_HANDOFF_DIRECTION}:${secret}`)
    .digest();
}

export function getCrossHandoffSecret() {
  return process.env.CAMPAIGN_HANDOFF_SECRET?.trim() ?? "";
}

export function sanitizeCrossHandoffPersonalization(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 50);
}

export function assertCrossHandoffFieldsAllowlisted(fields: Record<string, string>) {
  for (const key of Object.keys(fields)) {
    if (!ALLOWED_CROSS_HANDOFF_FIELD_KEYS.has(key)) {
      throw new Error(`Forbidden cross-handoff field: ${key}`);
    }
  }
}

export function sealCrossHandoffPayload(
  input: {
    productId: string;
    landingSlug: string;
    campaign: string;
    fields: Record<string, string>;
  },
  secret: string,
  now = Date.now(),
): string {
  assertCrossHandoffFieldsAllowlisted(input.fields);

  const payload: CrossHandoffPayload = {
    v: CROSS_HANDOFF_VERSION,
    dir: CROSS_HANDOFF_DIRECTION,
    iat: now,
    exp: now + CROSS_HANDOFF_COOKIE_MAX_AGE_SECONDS * 1000,
    jti: randomBytes(16).toString("hex"),
    productId: input.productId,
    landingSlug: input.landingSlug,
    campaign: input.campaign,
    fields: input.fields,
  };

  const iv = randomBytes(12);
  const key = deriveCrossHandoffKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function openCrossHandoffPayload(
  sealed: string,
  secret: string,
  now = Date.now(),
): CrossHandoffOpenResult {
  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  let raw: Buffer;
  try {
    raw = Buffer.from(sealed, "base64url");
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (raw.length < 29) {
    return { ok: false, reason: "invalid" };
  }

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const key = deriveCrossHandoffKey(secret);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8")) as CrossHandoffPayload;

    if (payload.v !== CROSS_HANDOFF_VERSION) {
      return { ok: false, reason: "wrong_version" };
    }

    if (payload.dir !== CROSS_HANDOFF_DIRECTION) {
      return { ok: false, reason: "wrong_direction" };
    }

    if (
      !payload.jti ||
      !payload.productId ||
      !payload.landingSlug ||
      !payload.fields ||
      typeof payload.fields !== "object"
    ) {
      return { ok: false, reason: "tampered" };
    }

    if (payload.exp <= now) {
      return { ok: false, reason: "expired" };
    }

    assertCrossHandoffFieldsAllowlisted(payload.fields);

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "tampered" };
  }
}

export function mapCrossHandoffFieldsToFormState(
  fields: Record<string, string>,
): CrossHandoffFormState | null {
  const sizeKey = fields.option_razmer_na_komplekta;
  const coloring = fields.option_coloring;
  if (!sizeKey || !coloring) {
    return null;
  }

  const size =
    CROSS_HANDOFF_SIZE_VALUE_TO_LANDING[
      sizeKey as keyof typeof CROSS_HANDOFF_SIZE_VALUE_TO_LANDING
    ];
  if (!size || !CROSS_HANDOFF_LANDING_COLORING_VALUES.has(coloring)) {
    return null;
  }

  const rawName = fields[CROSS_HANDOFF_PERSONALIZATION_POST_KEY];
  const personalizationName = rawName
    ? sanitizeCrossHandoffPersonalization(rawName)
    : "";

  return {
    size,
    coloring,
    personalize: Boolean(personalizationName),
    personalizationName,
  };
}

export function validateCrossHandoffFormState(formState: CrossHandoffFormState) {
  if (!CROSS_HANDOFF_LANDING_SIZE_VALUES.has(formState.size)) {
    return false;
  }

  if (!CROSS_HANDOFF_LANDING_COLORING_VALUES.has(formState.coloring)) {
    return false;
  }

  if (formState.personalize && !formState.personalizationName) {
    return false;
  }

  if (!formState.personalize && formState.personalizationName) {
    return false;
  }

  return true;
}
