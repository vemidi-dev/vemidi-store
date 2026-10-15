export const participantTypeLabels = {
  child: "Дете",
  adult: "Възрастен",
  child_with_guardian: "Дете с придружител",
} as const;

export type ParticipantType = keyof typeof participantTypeLabels;
export type EventQuestion = {
  id: string;
  label: string;
  type: "text" | "number" | "select";
  scope: "participant" | "registration";
  required: boolean;
  options: string[];
};
export type EventRegistrationSettings = {
  allowedTypes: ParticipantType[];
  age: "hidden" | "optional" | "required";
  questions: EventQuestion[];
};
export type EventAnswer = { id: string; label: string; value: string; type?: EventQuestion["type"] };
export type EventParticipant = { name: string; type: ParticipantType; age: number | null; answers: EventAnswer[] };
export type EventPhoto = { image_url: string; alt_text: string };

export const EVENT_PAYMENT_LABEL = "Плащане на място";
export const defaultEventRegistrationSettings: EventRegistrationSettings = {
  allowedTypes: ["child", "adult", "child_with_guardian"], age: "optional", questions: [],
};

function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseEventRegistrationSettings(value: unknown): { settings: EventRegistrationSettings; error?: string } {
  const fail = (error: string) => ({ settings: defaultEventRegistrationSettings, error });
  if (value === null || value === undefined || (object(value) && !Object.keys(value).length)) return { settings: defaultEventRegistrationSettings };
  if (!object(value) || !Array.isArray(value.allowedTypes) || !value.allowedTypes.length || value.allowedTypes.some((type) => typeof type !== "string" || !Object.hasOwn(participantTypeLabels, type))) return fail("Изберете поне един допустим вид участник.");
  if (!["hidden", "optional", "required"].includes(String(value.age))) return fail("Невалидна настройка за възрастта.");
  if (!Array.isArray(value.questions) || value.questions.length > 20) return fail("Допустими са до 20 допълнителни въпроса.");
  const questions: EventQuestion[] = [];
  for (const q of value.questions) {
    if (!object(q) || typeof q.id !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(q.id) || questions.some((other) => other.id === q.id) || typeof q.label !== "string" || !q.label.trim() || q.label.length > 120 || !["text", "number", "select"].includes(String(q.type)) || !["participant", "registration"].includes(String(q.scope)) || typeof q.required !== "boolean") return fail("Всеки въпрос трябва да има уникален код, заглавие, вид и обхват.");
    if (!Array.isArray(q.options) || q.options.some((option) => typeof option !== "string" || option.length > 100) || q.options.length > 50) return fail("Вариантите за избор трябва да са текстове до 100 символа, максимум 50.");
    const options = [...new Set((q.options as string[]).map((option) => option.trim()).filter(Boolean))];
    if (q.type === "select" && !options.length) return fail(`Добавете варианти за „${q.label}“.`);
    questions.push({ id: q.id, label: q.label.trim(), type: q.type as EventQuestion["type"], scope: q.scope as EventQuestion["scope"], required: q.required, options: q.type === "select" ? options : [] });
  }
  return { settings: { allowedTypes: [...new Set(value.allowedTypes)] as ParticipantType[], age: value.age as EventRegistrationSettings["age"], questions } };
}

export function readEventSettingsForm(form: FormData) {
  try {
    return parseEventRegistrationSettings(JSON.parse(String(form.get("registration_settings") ?? "{}")));
  } catch {
    return { settings: defaultEventRegistrationSettings, error: "Настройките на записването не са валидни." };
  }
}

function answersFor(raw: unknown, questions: EventQuestion[]): EventAnswer[] {
  const source = object(raw) ? raw : {};
  if (Object.keys(source).some((id) => !questions.some((q) => q.id === id))) throw new Error("Въпросите са променени. Обновете страницата и опитайте отново.");
  return questions.flatMap((q) => {
    const entry = source[q.id];
    if (entry !== undefined && typeof entry !== "string") throw new Error(`Невалиден отговор за „${q.label}“.`);
    const value = String(entry ?? "").trim();
    if (!value) {
      if (q.required) throw new Error(`Попълнете „${q.label}“.`);
      return [];
    }
    if (value.length > 500 || (q.type === "select" && !q.options.includes(value)) || (q.type === "number" && (!Number.isFinite(Number(value)) || Number(value) < 0))) throw new Error(`Невалиден отговор за „${q.label}“.`);
    return [{ id: q.id, label: q.label, value, type: q.type }];
  });
}

export function validateEventParticipants(raw: unknown, rawAnswers: unknown, settings: EventRegistrationSettings, price: number | null) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 10) throw new Error("Добавете между 1 и 10 участници.");
  const participants: EventParticipant[] = raw.map((p, index) => {
    if (!object(p) || !settings.allowedTypes.includes(p.type as ParticipantType)) throw new Error(`Изберете валиден вид за участник ${index + 1}.`);
    if (typeof p.name !== "string" || p.name.trim().length < 2 || p.name.length > 120) throw new Error(`Въведете име за участник ${index + 1}.`);
    if (settings.age !== "hidden" && p.age !== undefined && p.age !== null && typeof p.age !== "string" && typeof p.age !== "number") throw new Error(`Невалидна възраст за участник ${index + 1}.`);
    const age = settings.age === "hidden" || (typeof p.age === "string" && !p.age.trim()) || p.age === null || p.age === undefined ? null : Number(p.age);
    if (age !== null && (!Number.isInteger(age) || age < 0 || age > 120)) throw new Error(`Невалидна възраст за участник ${index + 1}.`);
    if (settings.age === "required" && p.type !== "adult" && age === null) throw new Error(`Добавете възраст за участник ${index + 1}.`);
    return { name: p.name.trim(), type: p.type as ParticipantType, age, answers: answersFor(p.answers, settings.questions.filter((q) => q.scope === "participant")) };
  });
  const answers = answersFor(rawAnswers, settings.questions.filter((q) => q.scope === "registration"));
  return { participants, answers, seats: participants.length, guardians: participants.filter((p) => p.type === "child_with_guardian").length, totalAmount: price === null ? null : Math.round(price * 100) * participants.length / 100 };
}
