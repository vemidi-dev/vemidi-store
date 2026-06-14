type JsonLdValue =
  | string
  | number
  | boolean
  | JsonLdObject
  | JsonLdValue[];

type JsonLdObject = {
  [key: string]: JsonLdValue;
};

function isPresent(value: unknown): value is string | number | boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return typeof value === "number" || typeof value === "boolean";
}

export function compactJsonLd<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((entry) => compactJsonLd(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, compactJsonLd(entry)] as const)
      .filter(([, entry]) => {
        if (Array.isArray(entry)) {
          return entry.length > 0;
        }

        return isPresent(entry) || (entry && typeof entry === "object");
      });

    return Object.fromEntries(entries) as T;
  }

  return value;
}

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(compactJsonLd(data)).replace(/</g, "\\u003c");
}
