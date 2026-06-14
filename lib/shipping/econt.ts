export type EcontCity = {
  id: number;
  name: string;
  postCode: string;
  regionName?: string;
};

export type EcontOffice = {
  id: number;
  code: string;
  name: string;
  isAPS: boolean;
  fullAddress: string;
};

type EcontCitiesResponse = {
  cities?: Array<{
    id?: number;
    name?: string;
    postCode?: string;
    regionName?: string;
  }>;
};

type EcontOfficesResponse = {
  offices?: Array<{
    id?: number;
    code?: string;
    name?: string;
    isAPS?: boolean;
    address?: {
      fullAddress?: string;
      city?: {
        name?: string;
      };
    };
  }>;
};

const ECONT_NOMENCLATURES_URL =
  "https://ee.econt.com/services/Nomenclatures/NomenclaturesService";
const CITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const ECONT_REQUEST_TIMEOUT_MS = 8_000;

let cityCache:
  | {
      loadedAt: number;
      cities: EcontCity[];
    }
  | null = null;

function getEcontCredentials() {
  const username =
    process.env.ECONT_API_USERNAME?.trim() ||
    process.env.ECONT_USERNAME?.trim() ||
    process.env.ECONT_USER?.trim();
  const password =
    process.env.ECONT_API_PASSWORD?.trim() ||
    process.env.ECONT_PASSWORD?.trim() ||
    process.env.ECONT_PASS?.trim();

  return { username, password };
}

export function isEcontConfigured() {
  const { username, password } = getEcontCredentials();
  return Boolean(username && password);
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase("bg-BG");
}

export function filterEcontCities(cities: EcontCity[], query: string, limit = 20) {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  return cities
    .filter((city) => {
      const haystack = normalizeSearchText(
        [city.name, city.regionName, city.postCode].filter(Boolean).join(" "),
      );
      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}

export function formatEcontOfficeLabel(office: EcontOffice) {
  return office.fullAddress
    ? `${office.name} — ${office.fullAddress}`
    : office.name;
}

async function postEcont<T>(method: string, body: Record<string, unknown>) {
  const { username, password } = getEcontCredentials();

  if (!username || !password) {
    throw new Error("ECONT_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ECONT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${ECONT_NOMENCLATURES_URL}.${method}.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ECONT_REQUEST_FAILED:${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ECONT_REQUEST_TIMEOUT");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function mapCities(response: EcontCitiesResponse): EcontCity[] {
  return (response.cities ?? []).flatMap((city) => {
    if (typeof city.id !== "number" || !city.name?.trim()) {
      return [];
    }

    return [{
      id: city.id,
      name: city.name.trim(),
      postCode: String(city.postCode ?? "").trim(),
      regionName: city.regionName?.trim() || undefined,
    }];
  });
}

function mapOffices(response: EcontOfficesResponse): EcontOffice[] {
  return (response.offices ?? []).flatMap((office) => {
    if (typeof office.id !== "number" || !office.name?.trim()) {
      return [];
    }

    const addressParts = [
      office.address?.city?.name,
      office.address?.fullAddress,
    ].filter(Boolean);

    return [{
      id: office.id,
      code: String(office.code ?? office.id),
      name: office.name.trim(),
      isAPS: Boolean(office.isAPS),
      fullAddress: addressParts.join(", "),
    }];
  });
}

export async function loadEcontCities() {
  if (cityCache && Date.now() - cityCache.loadedAt < CITY_CACHE_TTL_MS) {
    return cityCache.cities;
  }

  const response = await postEcont<EcontCitiesResponse>("getCities", {
    countryCode: "BGR",
  });
  const cities = mapCities(response);
  cityCache = {
    loadedAt: Date.now(),
    cities,
  };

  return cities;
}

export async function searchEcontCities(query: string, limit = 20) {
  const cities = await loadEcontCities();
  return filterEcontCities(cities, query, limit);
}

export async function getEcontOffices(cityId: number, automatOnly = false) {
  const response = await postEcont<EcontOfficesResponse>("getOffices", {
    countryCode: "BGR",
    cityID: cityId,
  });

  const offices = mapOffices(response);
  return automatOnly ? offices.filter((office) => office.isAPS) : offices.filter((office) => !office.isAPS);
}

export async function getEcontOfficesForDelivery(
  cityId: number,
  deliveryType: "office" | "automat",
) {
  return getEcontOffices(cityId, deliveryType === "automat");
}
