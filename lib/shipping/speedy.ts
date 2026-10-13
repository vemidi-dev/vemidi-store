export type SpeedyCity = {
  id: number;
  name: string;
  postCode: string;
  regionName?: string;
  type?: string;
};

export type SpeedyOffice = {
  id: number;
  name: string;
  isAPS: boolean;
  fullAddress: string;
};

type SpeedySiteResponse = {
  sites?: Array<{
    id?: number;
    name?: string;
    postCode?: string;
    region?: string;
    type?: string;
  }>;
  error?: unknown;
};

type SpeedyOfficeResponse = {
  offices?: Array<{
    id?: number;
    name?: string;
    type?: string;
    address?: {
      fullAddressString?: string;
      siteAddressString?: string;
      localAddressString?: string;
    };
  }>;
  error?: unknown;
};

const SPEEDY_API_BASE_URL =
  process.env.SPEEDY_API_BASE_URL?.trim().replace(/\/+$/, "") ||
  "https://api.speedy.bg/v1";
const SPEEDY_COUNTRY_BULGARIA_ID = 100;
export const SPEEDY_REQUEST_TIMEOUT_MS = 8_000;

function getSpeedyCredentials() {
  return {
    username: process.env.SPEEDY_USERNAME?.trim() || process.env.SPEEDY_API_USERNAME?.trim(),
    password: process.env.SPEEDY_PASSWORD?.trim() || process.env.SPEEDY_API_PASSWORD?.trim(),
  };
}

export function isSpeedyConfigured() {
  const { username, password } = getSpeedyCredentials();
  return Boolean(username && password);
}

function normalizeSpeedyQuery(value: string) {
  return value.trim().slice(0, 40);
}

async function postSpeedy<T>(path: string, body: Record<string, unknown>) {
  const { username, password } = getSpeedyCredentials();

  if (!username || !password) {
    throw new Error("SPEEDY_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SPEEDY_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${SPEEDY_API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        userName: username,
        password,
        language: "BG",
        ...body,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`SPEEDY_REQUEST_FAILED:${response.status}`);
    }

    const payload = (await response.json()) as T & { error?: unknown };
    if (payload.error) {
      throw new Error("SPEEDY_RESPONSE_ERROR");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("SPEEDY_REQUEST_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mapCities(response: SpeedySiteResponse): SpeedyCity[] {
  return (response.sites ?? []).flatMap((site) => {
    if (typeof site.id !== "number" || !site.name?.trim()) {
      return [];
    }

    return [{
      id: site.id,
      name: site.name.trim(),
      postCode: String(site.postCode ?? "").trim(),
      regionName: site.region?.trim() || undefined,
      type: site.type?.trim() || undefined,
    }];
  });
}

function mapOffices(response: SpeedyOfficeResponse): SpeedyOffice[] {
  return (response.offices ?? []).flatMap((office) => {
    if (typeof office.id !== "number" || !office.name?.trim()) {
      return [];
    }

    const address = office.address;
    const fullAddress =
      address?.fullAddressString?.trim() ||
      [address?.siteAddressString, address?.localAddressString]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(", ");

    return [{
      id: office.id,
      name: office.name.trim(),
      isAPS: office.type === "APT",
      fullAddress,
    }];
  });
}

export function formatSpeedyOfficeLabel(office: Pick<SpeedyOffice, "name" | "fullAddress">) {
  return office.fullAddress ? `${office.name} — ${office.fullAddress}` : office.name;
}

export async function searchSpeedyCities(query: string) {
  const normalizedQuery = normalizeSpeedyQuery(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const response = await postSpeedy<SpeedySiteResponse>("location/site/", {
    countryId: SPEEDY_COUNTRY_BULGARIA_ID,
    name: normalizedQuery,
  });

  return mapCities(response);
}

export async function getSpeedyOfficesForDelivery(
  cityId: number,
  deliveryType: "office" | "automat",
) {
  const response = await postSpeedy<SpeedyOfficeResponse>("location/office/", {
    siteId: cityId,
    officeType: [deliveryType === "automat" ? "APT" : "OFFICE"],
    limit: 120,
  });

  const offices = mapOffices(response);
  return deliveryType === "automat"
    ? offices.filter((office) => office.isAPS)
    : offices.filter((office) => !office.isAPS);
}
