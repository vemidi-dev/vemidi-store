"use client";

import React, { useEffect, useId, useRef, useState, type ReactNode } from "react";

export function EventAdminTabs({ eventsContent, participantsContent, initialView = "events" }: { eventsContent: ReactNode; participantsContent: ReactNode; initialView?: "events" | "participants" }) {
  const [view, setView] = useState(initialView);
  const id = useId();
  const participantsPanel = useRef<HTMLDivElement>(null);
  const tabList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view === "participants") participantsPanel.current?.querySelectorAll("details").forEach((details) => { details.open = false; });
  }, [view]);
  useEffect(() => {
    const sync = () => setView(new URLSearchParams(window.location.search).get("eventsView") === "participants" ? "participants" : "events");
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function select(next: typeof view) {
    setView(next);
    const url = new URL(window.location.href);
    url.searchParams.set("eventsView", next);
    window.history.replaceState(window.history.state, "", url);
  }
  return <div className="space-y-6">
    <div ref={tabList} role="tablist" aria-label="Управление на събития" className="flex gap-2 border-b border-boutique-line" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? "events" : event.key === "End" ? "participants" : view === "events" ? "participants" : "events";
      select(next);
      tabList.current?.querySelector<HTMLButtonElement>(`[data-view="${next}"]`)?.focus();
    }}>
      {(["events", "participants"] as const).map((key) => <button key={key} data-view={key} id={`${id}-${key}-tab`} role="tab" type="button" aria-selected={view === key} aria-controls={`${id}-${key}-panel`} tabIndex={view === key ? 0 : -1} onClick={() => select(key)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors hover:bg-boutique-sage/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-boutique-sage-deep ${view === key ? "border-boutique-sage-deep text-boutique-sage-deep" : "border-transparent text-boutique-muted"}`}>{key === "events" ? "Събития" : "Участници"}</button>)}
    </div>
    <div id={`${id}-events-panel`} role="tabpanel" aria-labelledby={`${id}-events-tab`} hidden={view !== "events"} className="space-y-6">{eventsContent}</div>
    <div ref={participantsPanel} id={`${id}-participants-panel`} role="tabpanel" aria-labelledby={`${id}-participants-tab`} hidden={view !== "participants"}>{participantsContent}</div>
  </div>;
}
