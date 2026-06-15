import { siteConfig } from "@/config/site";
import { formatOrderDate } from "@/lib/admin/orders";

export type WithdrawalRequestRow = {
  id: string;
  reference_number: string;
  order_id: string | null;
  order_number_submitted: string;
  contact_email: string | null;
  contact_phone: string | null;
  customer_name: string;
  received_at: string;
  items_description: string;
  note: string | null;
  status: string;
  created_at: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildEmailShell(title: string, intro: string, body: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f4f1eb;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#fdfcfa;border:1px solid #e4ddd4;border-radius:16px;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#b8926a;">${escapeHtml(siteConfig.name)}</p>
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;color:#2a2824;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 24px;line-height:1.6;color:#5e5a54;">${intro}</p>
        ${body}
      </div>
    </div>
  `;
}

function renderWithdrawalDetails(request: WithdrawalRequestRow) {
  const rows: Array<[string, string]> = [
    ["Референция", request.reference_number],
    ["Номер на поръчка", request.order_number_submitted],
    ["Име", request.customer_name],
    ["Имейл", request.contact_email ?? ""],
    ["Телефон", request.contact_phone ?? ""],
    ["Дата на получаване", request.received_at],
    ["Артикули", request.items_description],
    ["Бележка", request.note ?? ""],
    ["Подадено на", formatOrderDate(request.created_at)],
  ];

  return rows
    .filter(([, value]) => value.trim())
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#5e5a54;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#2a2824;vertical-align:top;white-space:pre-wrap;">${escapeHtml(value)}</td>
        </tr>
      `,
    )
    .join("");
}

export function buildWithdrawalCustomerEmail(request: WithdrawalRequestRow) {
  const body = `
    <p style="margin:0 0 16px;color:#2a2824;">
      Получихме вашето заявление за отказ от договор. Запазете референцията за кореспонденция.
    </p>
    <p style="margin:0 0 16px;color:#2a2824;">
      <strong>Референция:</strong> ${escapeHtml(request.reference_number)}
    </p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#2a2824;">Копие на заявлението</h2>
    <table style="width:100%;border-collapse:collapse;">${renderWithdrawalDetails(request)}</table>
    <p style="margin:24px 0 0;line-height:1.6;color:#5e5a54;">
      Ще прегледаме заявлението и ще се свържем с вас при нужда.
      За рекламации вижте
      <a href="${escapeHtml(new URL("/returns", process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").toString())}" style="color:#4d5c4a;">Връщане и рекламации</a>.
    </p>
  `;

  return {
    subject: `Заявление за отказ ${request.reference_number} · ${siteConfig.name}`,
    html: buildEmailShell(
      "Заявление за отказ от договор",
      `${escapeHtml(request.customer_name)}, това е потвърждение, че заявлението е получено.`,
      body,
    ),
  };
}

export function buildWithdrawalAdminEmail(
  request: WithdrawalRequestRow,
  adminWithdrawalsUrl: string,
) {
  const body = `
    <p style="margin:0 0 16px;color:#2a2824;">
      <strong>Референция:</strong> ${escapeHtml(request.reference_number)}<br />
      <strong>Статус:</strong> ${escapeHtml(request.status)}
    </p>
    <table style="width:100%;border-collapse:collapse;">${renderWithdrawalDetails(request)}</table>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(adminWithdrawalsUrl)}" style="display:inline-block;background:#4d5c4a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">
        Отвори в админ панела
      </a>
    </p>
  `;

  return {
    subject: `Отказ от договор ${request.reference_number} · ${request.customer_name}`,
    html: buildEmailShell(
      "Ново заявление за отказ",
      "Получено е заявление за отказ от договор през публичната форма.",
      body,
    ),
  };
}
