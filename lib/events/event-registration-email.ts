export type EventRegistrationEmailInput = {
  eventTitle: string;
  eventSlug: string;
  eventStartsAt: string | null;
  eventLocation: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  participantCount: number;
  note: string | null;
};

type EmailMessage = {
  subject: string;
  html: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatEventDate(value: string | null) {
  if (!value) {
    return "Не е зададена дата";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date(value));
}

function detailRow(label: string, value: string | number | null) {
  const normalizedValue = value === null || value === "" ? "Не е попълнено" : String(value);

  return `
    <tr>
      <td style="padding:8px 12px;color:#6b625b;font-weight:600;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;color:#2d2a26;vertical-align:top;">${escapeHtml(normalizedValue).replace(/\n/g, "<br />")}</td>
    </tr>
  `;
}

export function buildAdminEventRegistrationEmail(
  input: EventRegistrationEmailInput,
  adminEventsUrl: string,
): EmailMessage {
  const subject = `Ново записване за събитие: ${input.eventTitle}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#2d2a26;">
      <h1 style="font-size:22px;margin:0 0 16px;">Ново записване за събитие</h1>
      <p style="margin:0 0 20px;color:#6b625b;">Получена е нова заявка за участие през сайта.</p>

      <table style="border-collapse:collapse;width:100%;max-width:680px;border:1px solid #e7ded5;">
        <tbody>
          ${detailRow("Събитие", input.eventTitle)}
          ${detailRow("Дата", formatEventDate(input.eventStartsAt))}
          ${detailRow("Локация", input.eventLocation)}
          ${detailRow("Име", input.fullName)}
          ${detailRow("Телефон", input.phone)}
          ${detailRow("Имейл", input.email)}
          ${detailRow("Брой участници", input.participantCount)}
          ${detailRow("Бележка", input.note)}
        </tbody>
      </table>

      <p style="margin:20px 0 0;">
        <a href="${escapeHtml(adminEventsUrl)}" style="color:#5f7558;">Отвори записванията в админ панела</a>
      </p>
    </div>
  `;

  return { subject, html };
}
