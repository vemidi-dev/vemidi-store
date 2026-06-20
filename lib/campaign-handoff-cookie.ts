import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type { CampaignHandoffSuccess } from "@/lib/campaign-handoff";
import { CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS } from "@/lib/campaign-handoff-cookie-config";

export {
  buildCampaignHandoffClearCookieHeader,
  buildCampaignHandoffSetCookieHeader,
  CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS,
  CAMPAIGN_HANDOFF_COOKIE_NAME,
  CAMPAIGN_HANDOFF_COOKIE_PATH,
} from "@/lib/campaign-handoff-cookie-config";

type StoredHandoffPayload = {
  v: 1;
  exp: number;
  jti: string;
  fields: Record<string, string>;
  signature: string;
};

function deriveCampaignHandoffKey(secret: string) {
  return createHash("sha256").update(`campaign-handoff:v1:${secret}`).digest();
}

export function getCampaignHandoffSecret() {
  return process.env.CAMPAIGN_HANDOFF_SECRET?.trim() ?? "";
}

export function sealCampaignHandoffPayload(
  fields: Record<string, string>,
  result: CampaignHandoffSuccess,
  secret: string,
  now = Date.now(),
): string {
  const payload: StoredHandoffPayload = {
    v: 1,
    exp: now + CAMPAIGN_HANDOFF_COOKIE_MAX_AGE_SECONDS * 1000,
    jti: randomBytes(16).toString("hex"),
    fields,
    signature: buildStoredSignature(result),
  };

  const iv = randomBytes(12);
  const key = deriveCampaignHandoffKey(secret);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function openCampaignHandoffPayload(
  sealed: string,
  secret: string,
  now = Date.now(),
):
  | { ok: true; payload: StoredHandoffPayload }
  | { ok: false; reason: "missing_secret" | "invalid" | "expired" | "tampered" } {
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
  const key = deriveCampaignHandoffKey(secret);

  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString("utf8")) as StoredHandoffPayload;

    if (payload.v !== 1 || !payload.jti || !payload.fields || !payload.signature) {
      return { ok: false, reason: "tampered" };
    }

    if (payload.exp <= now) {
      return { ok: false, reason: "expired" };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, reason: "tampered" };
  }
}

export function buildStoredSignature(result: CampaignHandoffSuccess) {
  return [
    result.product.id,
    result.quantity,
    result.attribution.source,
    result.attribution.campaign ?? "",
    result.attribution.landingUrl ?? "",
    result.selectedColors.map((color) => `${color.fieldId}:${color.optionId}`).join(","),
    result.optionSelections
      ?.map((selection) =>
        `${selection.groupId}:${selection.valueIds.join(",")}:${selection.textValue ?? ""}`,
      )
      .join(",") ?? "",
    result.personalizationFields?.map((field) => `${field.fieldKey}=${field.value}`).join(",") ??
      "",
  ].join("|");
}

export function signaturesMatch(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
