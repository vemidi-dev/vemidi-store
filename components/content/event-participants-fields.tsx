"use client";

import { useId, useRef, useState } from "react";
import { formatEur } from "@/lib/format-eur";
import { EVENT_PAYMENT_LABEL, eventQuestionApplies, participantTypeLabels, type EventQuestion, type EventRegistrationSettings, type ParticipantType } from "@/lib/events/registration-config";
import { calculateEventParticipantTotal, eventMaterialsLabels } from "@/lib/events/pricing";

const fieldClass = "mt-2 w-full min-w-0 rounded-lg border border-boutique-line bg-white px-4 py-3 text-boutique-ink";

export function EventQuestionInput({ question, value, onChange }: { question: EventQuestion; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <label htmlFor={id} className="min-w-0 text-sm font-medium text-boutique-ink">{question.label}{question.required ? " *" : " (по избор)"}
    {question.type === "select" ? <select id={id} value={value} onChange={(event) => onChange(event.target.value)} required={question.required} className={fieldClass}><option value="">Изберете</option>{question.options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : <input id={id} type={question.type === "number" ? "number" : "text"} min={question.type === "number" ? 0 : undefined} step={question.type === "number" ? "any" : undefined} maxLength={500} required={question.required} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass} />}
  </label>;
}

type DraftParticipant = { key: number; type: ParticipantType; name: string; age: string; answers: Record<string, string>; materialsOption?: string };

export function EventParticipantsFields({ settings, availableSpots, price }: { settings: EventRegistrationSettings; availableSpots: number; price: number | null }) {
  const nextKey = useRef(2);
  const groupId = useId();
  const [participants, setParticipants] = useState<DraftParticipant[]>([{ key: 1, type: settings.allowedTypes[0], name: "", age: "", answers: {} }]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const maxParticipants = Math.min(10, availableSpots);
  const total = calculateEventParticipantTotal(participants.map((p) => p.materialsOption), settings.materialsPricing, price);
  function update(key: number, changes: Partial<DraftParticipant>) {
    setParticipants((previous) => previous.map((p) => {
      if (p.key !== key) return p;
      const next = { ...p, ...changes };
      if (changes.materialsOption !== undefined) next.answers = Object.fromEntries(Object.entries(next.answers).filter(([id]) => settings.questions.some((q) => q.id === id && q.scope === "participant" && eventQuestionApplies(q, next.materialsOption))));
      return next;
    }));
  }
  return <div className="space-y-5 sm:col-span-2">
    <input type="hidden" name="participants" value={JSON.stringify(participants.map((p) => ({ name: p.name, type: p.type, age: p.age, answers: p.answers, ...(settings.materialsPricing ? { materialsOption: p.materialsOption ?? "" } : {}) })))} />
    <input type="hidden" name="registration_answers" value={JSON.stringify(answers)} />
    {participants.map((p, index) => <fieldset key={p.key} className="min-w-0 border-l-2 border-boutique-sage/40 bg-boutique-sage/5 px-4 pb-5 pt-4 sm:px-5">
      <legend className="sr-only">Участник {index + 1}</legend>
      <p aria-hidden="true" className="mb-4 border-b border-boutique-sage/20 pb-3 text-base font-semibold text-boutique-sage-deep">Участник {index + 1}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm font-medium text-boutique-ink">Вид участие *<select value={p.type} onChange={(event) => update(p.key, { type: event.target.value as ParticipantType })} className={fieldClass}>{settings.allowedTypes.map((type) => <option key={type} value={type}>{participantTypeLabels[type]}</option>)}</select></label>
        <label className="min-w-0 text-sm font-medium text-boutique-ink">Име на участника *<input required minLength={2} maxLength={120} value={p.name} onChange={(event) => update(p.key, { name: event.target.value })} className={fieldClass} /></label>
        {settings.age !== "hidden" ? <label className="min-w-0 text-sm font-medium text-boutique-ink">Възраст {settings.age === "required" && p.type !== "adult" ? "*" : "(по избор)"}<input type="number" min={0} max={120} step={1} required={settings.age === "required" && p.type !== "adult"} value={p.age} onChange={(event) => update(p.key, { age: event.target.value })} className={fieldClass} /></label> : null}
        {settings.questions.filter((q) => q.scope === "participant" && eventQuestionApplies(q, p.materialsOption)).map((q) => <EventQuestionInput key={q.id} question={q} value={p.answers[q.id] ?? ""} onChange={(value) => update(p.key, { answers: { ...p.answers, [q.id]: value } })} />)}
      </div>
      {settings.materialsPricing ? <fieldset className="mt-4 min-w-0">
        <legend className="text-sm font-medium text-boutique-ink">Материали и цена *</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">{(["studio", "home"] as const).map((option) => <label key={option} className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-boutique-sage-deep ${p.materialsOption === option ? "border-boutique-sage-deep bg-boutique-sage/10" : "border-boutique-line bg-white"}`}>
          <input type="radio" name={`${groupId}-materials-${p.key}`} value={option} required checked={p.materialsOption === option} onChange={() => update(p.key, { materialsOption: option })} className="mt-1 shrink-0 accent-boutique-sage-deep" />
          <span className="min-w-0"><span className="block text-sm font-semibold text-boutique-ink">{eventMaterialsLabels[option]} · {formatEur(settings.materialsPricing![option].price)}</span><span className="mt-1 block whitespace-pre-line break-words text-sm leading-6 text-boutique-muted">{settings.materialsPricing![option].materials}</span></span>
        </label>)}</div>
      </fieldset> : null}
      {p.type === "child_with_guardian" ? <p className="mt-3 text-sm text-boutique-muted">Придружителят не заема отделно място и не се таксува. Ако също участва в заниманието, добавете го отделно като възрастен.</p> : null}
      {participants.length > 1 ? <button type="button" onClick={() => setParticipants((previous) => previous.filter((item) => item.key !== p.key))} className="mt-3 text-sm font-semibold text-red-700" aria-label={`Премахни участник ${index + 1}`}>Премахни</button> : null}
    </fieldset>)}
    <button type="button" disabled={participants.length >= maxParticipants} onClick={() => setParticipants((previous) => [...previous, { key: nextKey.current++, type: settings.allowedTypes[0], name: "", age: "", answers: {} }])} className="rounded-lg border border-boutique-line px-4 py-3 text-sm font-semibold text-boutique-ink disabled:opacity-40">Добави участник</button>
    <div className="grid gap-4 sm:grid-cols-2">{settings.questions.filter((q) => q.scope === "registration").map((q) => <EventQuestionInput key={q.id} question={q} value={answers[q.id] ?? ""} onChange={(value) => setAnswers((previous) => ({ ...previous, [q.id]: value }))} />)}</div>
    <div className="flex flex-wrap justify-between gap-3 border-y border-boutique-line py-4 text-sm text-boutique-ink">
      <span>{participants.length} {participants.length === 1 ? "участник · 1 място" : "участници · " + participants.length + " места"}</span>
      <span aria-live="polite">{total === null ? (settings.materialsPricing ? "Общо: — · " + EVENT_PAYMENT_LABEL.toLowerCase() : EVENT_PAYMENT_LABEL) : `${formatEur(total)} · ${EVENT_PAYMENT_LABEL.toLowerCase()}`}</span>
    </div>
  </div>;
}
