import { participantTypeLabels, type EventAnswer, type EventParticipant } from "@/lib/events/registration-config";

export function participantSummaryLines(participants: EventParticipant[] = [], answers: EventAnswer[] = []) {
  return [
    ...participants.map((p, index) => `${index + 1}. ${p.name} · ${participantTypeLabels[p.type]}${p.age !== null ? ` · ${p.age} г.` : ""}${p.answers.length ? " · " + p.answers.map((a) => `${a.label}: ${a.value}`).join("; ") : ""}`),
    ...answers.map((a) => `${a.label}: ${a.value}`),
  ];
}
