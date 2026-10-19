"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { calendarDateLabel, calendarDays, shiftCalendarMonth } from "@/lib/events/calendar";
import { eventDateTimeDisplay, parseEventDateTime, toEventDateTimeLocal } from "@/lib/events/event-datetime";

export function EventDateTimeInput({ name, defaultValue = "", className }: { name: string; defaultValue?: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16, width: 288 });
  const [month, setMonth] = useState(() => defaultValue.slice(0, 7) || toEventDateTimeLocal(new Date().toISOString()).slice(0, 7));

  function validate() {
    const field = input.current;
    if (field) field.setCustomValidity(parseEventDateTime(field.value) === undefined ? "Въведете валидна дата и час във формат ДД/ММ/ГГГГ ЧЧ:ММ (00:00–23:59)." : "");
  }

  useEffect(() => {
    const field = input.current;
    const form = field?.form;
    function restore() {
      if (field) { field.value = eventDateTimeDisplay(field.value); validate(); }
    }
    function reset() { queueMicrotask(() => { validate(); setOpen(false); }); }
    restore();
    form?.addEventListener("event-draft-restored", restore);
    form?.addEventListener("reset", reset);
    return () => { form?.removeEventListener("event-draft-restored", restore); form?.removeEventListener("reset", reset); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const initial = panel.current?.querySelector<HTMLButtonElement>('button[aria-current="date"]') ?? panel.current;
    initial?.focus();
    function close(event: PointerEvent) {
      if (!panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    const resize = () => setOpen(false);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("resize", resize); };
  }, [open]);

  function pick(day: string) {
    const field = input.current;
    if (!field) return;
    const time = / (\d{2}:\d{2})$/.exec(field.value)?.[1] ?? "09:00";
    field.value = eventDateTimeDisplay(`${day}T${time}`);
    validate();
    field.dispatchEvent(new Event("input", { bubbles: true }));
    setOpen(false);
    field.focus();
  }

  return <div className="relative min-w-0">
    <div className="relative">
      <input ref={input} name={name} type="text" defaultValue={eventDateTimeDisplay(defaultValue)} placeholder="ДД/ММ/ГГГГ ЧЧ:ММ" maxLength={16} pattern="[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}" onChange={validate} className={`${className ?? ""} pr-12`} />
      <button ref={trigger} type="button" title="Избери дата" aria-label="Избери дата" aria-expanded={open} aria-controls={id} onClick={() => {
        const value = input.current?.value ?? "";
        const parsed = parseEventDateTime(value);
        if (parsed) setMonth(toEventDateTimeLocal(parsed).slice(0, 7));
        const rect = input.current?.getBoundingClientRect();
        const width = Math.min(288, window.innerWidth - 32);
        if (rect) setPosition({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)), top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 336)), width });
        setOpen(!open);
      }} className="absolute bottom-0 right-0 grid h-11 w-11 place-items-center rounded-lg hover:bg-boutique-sage/15"><CalendarDays aria-hidden="true" className="h-4 w-4" /></button>
    </div>
    {open ? createPortal(<div ref={panel} id={id} role="dialog" tabIndex={-1} aria-label="Избор на дата" style={position} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }} className="fixed z-50 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-boutique-line bg-white p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button type="button" aria-label="Предишен месец" disabled={month === "1900-01"} onClick={() => setMonth(shiftCalendarMonth(month, -1))} className="grid h-8 w-8 place-items-center rounded hover:bg-boutique-sage/15"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm first-letter:uppercase">{calendarDateLabel(month, true)}</span>
        <button type="button" aria-label="Следващ месец" disabled={month === "2100-12"} onClick={() => setMonth(shiftCalendarMonth(month, 1))} className="grid h-8 w-8 place-items-center rounded hover:bg-boutique-sage/15"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" aria-label="Затвори календара" onClick={() => { setOpen(false); trigger.current?.focus(); }} className="grid h-8 w-8 place-items-center rounded hover:bg-boutique-sage/15"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map(day => <span key={day} className="py-2 text-boutique-muted">{day}</span>)}{calendarDays(month).map(day => <button key={day} type="button" aria-label={calendarDateLabel(day)} aria-current={day === toEventDateTimeLocal(new Date().toISOString()).slice(0, 10) ? "date" : undefined} onClick={() => pick(day)} className={`h-8 rounded transition hover:bg-boutique-sage/20 focus-visible:outline focus-visible:outline-2 ${day.startsWith(month) ? "text-boutique-ink" : "text-boutique-muted/60"}`}>{Number(day.slice(-2))}</button>)}</div>
    </div>, document.body) : null}
  </div>;
}
