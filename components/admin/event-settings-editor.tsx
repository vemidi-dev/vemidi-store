"use client";

import { useEffect, useRef, useState } from "react";
import { adminFieldClass } from "@/components/admin/styles";
import { parseEventRegistrationSettings, participantTypeLabels, EVENT_PAYMENT_LABEL, type EventQuestion, type EventPhoto } from "@/lib/events/registration-config";

export function EventSettingsEditor({ settings, photos = [] }: { settings?: unknown; photos?: EventPhoto[] }) {
  const [config, setConfig] = useState(() => parseEventRegistrationSettings(settings).settings);
  const [gallery, setGallery] = useState(photos);
  const settingsInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const initialRender = useRef(true);
  useEffect(() => {
    if (initialRender.current) { initialRender.current = false; return; }
    settingsInput.current?.form?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [config, gallery]);
  useEffect(() => {
    const form = settingsInput.current?.form;
    if (!form) return;
    const restore = () => {
      try {
        setConfig(parseEventRegistrationSettings(JSON.parse(settingsInput.current?.value || "{}")).settings);
        const images: unknown = JSON.parse(galleryInput.current?.value || "[]");
        if (Array.isArray(images)) setGallery(images as EventPhoto[]);
      } catch { /* Ignore a malformed browser draft. */ }
    };
    form.addEventListener("event-draft-restored", restore);
    return () => form.removeEventListener("event-draft-restored", restore);
  }, []);
  function changeQuestion(id: string, change: Partial<EventQuestion>) {
    setConfig((previous) => ({ ...previous, questions: previous.questions.map((q) => q.id === id ? { ...q, ...change } : q) }));
  }
  return <div className="space-y-6 border-t border-boutique-line pt-5 md:col-span-2">
    <input ref={settingsInput} type="hidden" name="registration_settings" value={JSON.stringify(config)} />
    <input ref={galleryInput} type="hidden" name="event_gallery_images" value={JSON.stringify(gallery)} />
    <fieldset>
      <legend className="font-semibold text-boutique-ink">Настройки на записването</legend>
      <div className="mt-3 flex flex-wrap gap-4">{Object.entries(participantTypeLabels).map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-boutique-ink"><input type="checkbox" checked={config.allowedTypes.includes(value as keyof typeof participantTypeLabels)} onChange={(event) => setConfig((previous) => ({ ...previous, allowedTypes: event.target.checked ? [...previous.allowedTypes, value as keyof typeof participantTypeLabels] : previous.allowedTypes.filter((type) => type !== value) }))} />{label}</label>)}</div>
      <p className="mt-3 text-sm text-boutique-muted">Един участник = едно място и една цена. Придружителят не се таксува; ако също работи, се добавя като възрастен. {EVENT_PAYMENT_LABEL}.</p>
      <label className="mt-4 block max-w-sm text-sm text-boutique-ink">Възраст на децата<select value={config.age} onChange={(event) => setConfig({ ...config, age: event.target.value as typeof config.age })} className={adminFieldClass}><option value="optional">По избор</option><option value="required">Задължителна</option><option value="hidden">Не се събира</option></select></label>
    </fieldset>
    <div>
      <h4 className="font-semibold text-boutique-ink">Допълнителни въпроси</h4>
      {config.questions.map((q) => <fieldset key={q.id} className="mt-4 grid min-w-0 gap-3 border-b border-boutique-line pb-4 sm:grid-cols-2">
        <label className="min-w-0 text-sm text-boutique-ink">Въпрос<input value={q.label} maxLength={120} required onChange={(event) => changeQuestion(q.id, { label: event.target.value })} className={adminFieldClass} /></label>
        <label className="min-w-0 text-sm text-boutique-ink">Вид<select value={q.type} onChange={(event) => changeQuestion(q.id, { type: event.target.value as EventQuestion["type"] })} className={adminFieldClass}><option value="text">Кратък текст</option><option value="number">Число</option><option value="select">Избор от списък</option></select></label>
        <label className="min-w-0 text-sm text-boutique-ink">Попълва се<select value={q.scope} onChange={(event) => changeQuestion(q.id, { scope: event.target.value as EventQuestion["scope"] })} className={adminFieldClass}><option value="participant">За всеки участник</option><option value="registration">Веднъж за регистрацията</option></select></label>
        <label className="flex items-center gap-2 text-sm text-boutique-ink"><input type="checkbox" checked={q.required} onChange={(event) => changeQuestion(q.id, { required: event.target.checked })} />Задължителен</label>
        {q.type === "select" ? <label className="text-sm text-boutique-ink sm:col-span-2">Варианти — по един на ред<textarea value={q.options.join("\n")} rows={4} required onChange={(event) => changeQuestion(q.id, { options: event.target.value.split("\n") })} className={adminFieldClass} /></label> : null}
        <button type="button" onClick={() => setConfig((previous) => ({ ...previous, questions: previous.questions.filter((item) => item.id !== q.id) }))} className="w-fit text-sm text-red-700">Премахни въпроса</button>
      </fieldset>)}
      <button type="button" disabled={config.questions.length >= 20} onClick={() => setConfig((previous) => ({ ...previous, questions: [...previous.questions, { id: `q-${crypto.randomUUID()}`, label: "", type: "text", scope: "participant", required: false, options: [] }] }))} className="mt-4 rounded-lg border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink disabled:opacity-40">Добави въпрос</button>
    </div>
    <fieldset>
      <legend className="font-semibold text-boutique-ink">Галерия на тази работилница</legend>
      {gallery.map((photo, index) => <div key={photo.image_url} className="mt-3 flex min-w-0 flex-wrap items-end gap-3">
        <a href={photo.image_url} target="_blank" rel="noreferrer" className="text-sm text-boutique-ink underline">Снимка {index + 1}</a>
        <label className="min-w-0 flex-1 basis-52 text-sm text-boutique-ink">Описание<input value={photo.alt_text} maxLength={200} onChange={(event) => setGallery((previous) => previous.map((item, i) => i === index ? { ...item, alt_text: event.target.value } : item))} className={adminFieldClass} /></label>
        <button type="button" onClick={() => setGallery((previous) => previous.filter((_, i) => i !== index))} className="py-3 text-sm text-red-700">Премахни</button>
      </div>)}
      <label className="mt-4 block text-sm text-boutique-ink">Добави снимки<input type="file" name="event_gallery_files" multiple accept="image/png,image/jpeg,image/webp" className={adminFieldClass} /></label>
      <p className="mt-2 text-xs text-boutique-muted">До 12 снимки общо, до 5 MB всяка. След запис можете да редактирате описанията им.</p>
    </fieldset>
  </div>;
}
