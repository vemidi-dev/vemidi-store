const sofiaFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Sofia",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

function localParts(date: Date) {
  return Object.fromEntries(sofiaFormatter.formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

export function toEventDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = localParts(date);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function parseEventDateTime(value: string): string | null | undefined {
  if (!value) return null;
  const display = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value);
  if (display) value = `${display[3]}-${display[2]}-${display[1]}T${display[4]}:${display[5]}`;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return undefined;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  const wallTime = Date.UTC(year, month - 1, day, hour, minute, second);
  const date = new Date(wallTime);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return undefined;

  // Check both offsets around a clock change, using IANA rules rather than the host timezone.
  const offsets = new Set([-86400000, 0, 86400000].map((delta) => {
    const sample = wallTime + delta;
    const p = localParts(new Date(sample));
    return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second)) - sample;
  }));
  const candidates = [...offsets].map((offset) => wallTime - offset).filter((timestamp) => {
    const p = localParts(new Date(timestamp));
    return Number(p.year) === year && Number(p.month) === month && Number(p.day) === day && Number(p.hour) === hour && Number(p.minute) === minute && Number(p.second) === second;
  });
  return candidates.length ? new Date(Math.min(...candidates)).toISOString() : undefined;
}

export function eventDateTimeDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : value;
}
