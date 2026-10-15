import { participantTypeLabels, type EventAnswer, type EventParticipant } from "@/lib/events/registration-config";
import { formatEur } from "@/lib/format-eur";

export function participantSummaryLines(participants: EventParticipant[] = [], answers: EventAnswer[] = [], startIndex = 0) {
  return [
    ...participants.map((p, index) => `${index + startIndex + 1}. ${p.name}${p.status === "cancelled" ? " · ОТКАЗАНО" : ""} · ${participantTypeLabels[p.type]}${p.age !== null ? ` · ${p.age} г.` : ""}${p.materialsLabel ? ` · ${p.materialsLabel}${p.unitPrice !== undefined ? `: ${formatEur(p.unitPrice)}` : ""}${p.materialsText ? ` · ${p.materialsText}` : ""}` : ""}${p.answers.length ? " · " + p.answers.map((a) => `${a.label}: ${a.value}`).join("; ") : ""}`),
    ...answers.map((a) => `${a.label}: ${a.value}`),
  ];
}
