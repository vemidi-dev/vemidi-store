export const CAMPAIGN_CODE_MAX_LENGTH = 64;
export const CAMPAIGN_SOURCE_MAX_LENGTH = 64;
export const LANDING_URL_MAX_LENGTH = 240;

export const STORE_ORDER_SOURCE = "vemidi-store";

const BLOCKED_SOURCE_VALUES = new Set([
  STORE_ORDER_SOURCE,
  "admin",
  "test",
]);

export type CampaignAttribution = {
  source: string;
  campaign?: string;
  landingUrl?: string;
};

export function normalizeCampaignCode(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase("bg")
    .replace(/[^a-z0-9а-я_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CAMPAIGN_CODE_MAX_LENGTH);

  return normalized || undefined;
}

export function normalizeCampaignSource(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value
    .trim()
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, CAMPAIGN_SOURCE_MAX_LENGTH);

  if (!normalized || BLOCKED_SOURCE_VALUES.has(normalized)) {
    return undefined;
  }

  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    return undefined;
  }

  return normalized;
}

export function resolveCampaignSource(
  explicitSource: unknown,
  campaign?: string,
) {
  const normalizedExplicit = normalizeCampaignSource(explicitSource);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  if (campaign) {
    return `campaign-${campaign}`;
  }

  return undefined;
}

export function buildCampaignAttribution(input: {
  source?: unknown;
  campaign?: unknown;
  landingUrl?: unknown;
}): CampaignAttribution | undefined {
  const campaign = normalizeCampaignCode(input.campaign);
  const source = resolveCampaignSource(input.source, campaign);
  const landingUrl = normalizeLandingUrl(input.landingUrl);

  if (!source && !campaign && !landingUrl) {
    return undefined;
  }

  return {
    source: source ?? (campaign ? `campaign-${campaign}` : "campaign-handoff"),
    campaign,
    landingUrl,
  };
}

export function normalizeLandingUrl(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim().slice(0, LANDING_URL_MAX_LENGTH);
  if (!trimmed) {
    return undefined;
  }

  try {
    const url = trimmed.startsWith("http")
      ? new URL(trimmed)
      : new URL(trimmed, "https://promo.vemidi-crafts.com");

    const allowedHosts = new Set([
      "vemidi-crafts.com",
      "www.vemidi-crafts.com",
      "promo.vemidi-crafts.com",
    ]);

    if (!allowedHosts.has(url.hostname.toLowerCase())) {
      return undefined;
    }

    if (url.protocol !== "https:") {
      return undefined;
    }

    if (url.username || url.password) {
      return undefined;
    }

    return `${url.origin}${url.pathname}`.slice(0, LANDING_URL_MAX_LENGTH);
  } catch {
    return undefined;
  }
}

export function mergeCampaignAttribution(
  current?: CampaignAttribution,
  next?: CampaignAttribution,
): CampaignAttribution | undefined {
  if (!current && !next) {
    return undefined;
  }

  return {
    source: next?.source ?? current?.source ?? STORE_ORDER_SOURCE,
    campaign: next?.campaign ?? current?.campaign,
    landingUrl: next?.landingUrl ?? current?.landingUrl,
  };
}

export function getCampaignSourceLabel(source: string) {
  if (source === STORE_ORDER_SOURCE) {
    return "Онлайн магазин";
  }
  if (source.startsWith("campaign-")) {
    return `Кампания (${source.slice("campaign-".length)})`;
  }
  return source;
}

export function attributionFromCartLine(line: {
  campaign?: string;
  source?: string;
  landingUrl?: string;
}): CampaignAttribution | undefined {
  return buildCampaignAttribution({
    campaign: line.campaign,
    source: line.source,
    landingUrl: line.landingUrl,
  });
}

export function resolveOrderAttributionFromLines(
  lines: Array<{
    campaign?: string;
    source?: string;
    landingUrl?: string;
  }>,
): CampaignAttribution | undefined {
  let resolved: CampaignAttribution | undefined;

  for (const line of lines) {
    const next = attributionFromCartLine(line);
    if (!next) {
      continue;
    }
    resolved = mergeCampaignAttribution(resolved, next);
  }

  return resolved;
}

export const CAMPAIGN_HANDOFF_SESSION_KEY = "vemidi:campaign-handoff-v1";
