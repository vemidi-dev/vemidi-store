import { formatEur } from "@/lib/format-eur";

export const eventMaterialsLabels = {
  studio: "Материали от ателието",
  home: "Материали от вкъщи",
} as const;
export type EventMaterialsOption = keyof typeof eventMaterialsLabels;
export type EventMaterialsPricing = Record<EventMaterialsOption, { price: number; materials: string }> & { displayText?: string };

export function parseEventMaterialsPricing(value: unknown): EventMaterialsPricing {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Попълнете двете цени и материалите към всяка от тях.");
  const source = value as Record<string, unknown>;
  const result = {} as EventMaterialsPricing;
  if (source.displayText !== undefined) {
    if (typeof source.displayText !== "string" || source.displayText.length > 160) throw new Error("Текстът за цената трябва да е до 160 символа.");
    if (source.displayText.trim()) result.displayText = source.displayText.trim();
  }
  for (const key of ["studio", "home"] as const) {
    const option = source[key];
    if (!option || typeof option !== "object" || Array.isArray(option)) throw new Error(`Попълнете „${eventMaterialsLabels[key]}“.`);
    const { price, materials } = option as Record<string, unknown>;
    if (typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) throw new Error(`Въведете валидна цена за „${eventMaterialsLabels[key]}“ с до два знака след запетаята.`);
    if (typeof materials !== "string" || !materials.trim() || materials.length > 1000) throw new Error(`Опишете материалите за „${eventMaterialsLabels[key]}“ (до 1000 символа).`);
    result[key] = { price, materials: materials.trim() };
  }
  return result;
}

export function getEventPriceOptions(event: { price: number | null; registration_settings?: unknown }) {
  const settings = event.registration_settings;
  if (settings && typeof settings === "object" && "materialsPricing" in settings && settings.materialsPricing !== undefined) {
    try {
      const pricing = parseEventMaterialsPricing(settings.materialsPricing);
      return (["studio", "home"] as const).map((key) => ({ key, label: eventMaterialsLabels[key], ...pricing[key] }));
    } catch { return []; }
  }
  return event.price === null ? [] : [{ key: "single", label: "Участие", price: event.price, materials: "" }];
}

export function formatEventPrice(event: { price: number | null; registration_settings?: unknown }) {
  const rawSettings = event.registration_settings;
  if (rawSettings && typeof rawSettings === "object" && "priceDisplayText" in rawSettings && typeof rawSettings.priceDisplayText === "string" && rawSettings.priceDisplayText.trim() && rawSettings.priceDisplayText.length <= 1000) return rawSettings.priceDisplayText.trim();
  const options = getEventPriceOptions(event);
  if (!options.length) return null;
  if (options.length === 1) return formatEur(options[0].price);
  const settings = event.registration_settings as { materialsPricing: EventMaterialsPricing };
  return settings.materialsPricing.displayText?.trim() || options.map((option) => formatEur(option.price)).join(" / ");
}

export function calculateEventParticipantTotal(options: (string | undefined)[], pricing: EventMaterialsPricing | undefined, singlePrice: number | null) {
  if (!pricing) return singlePrice === null ? null : Math.round(singlePrice * 100) * options.length / 100;
  let cents = 0;
  for (const option of options) {
    if (option !== "studio" && option !== "home") return null;
    cents += Math.round(pricing[option].price * 100);
  }
  return cents / 100;
}
