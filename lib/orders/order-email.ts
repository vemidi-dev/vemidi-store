import {
  formatOrderDate,
  formatOrderPrice,
  getPaymentMethodLabel,
  parseStoreOrderItems,
  type OrderRow,
} from "@/lib/admin/orders";
import { formatOrderOptionLine } from "@/lib/order-option-display";
import { siteConfig } from "@/config/site";

export type StoreOrderEmailItem = {
  name: string;
  unitPrice: number | null;
  quantity: number;
  personalization: string | null;
  selectedColors: Array<{
    fieldLabel?: string;
    optionName?: string;
  }>;
  optionLines: string[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function labelCourier(value: string | null) {
  if (value === "econt") return "Еконт";
  if (value === "speedy") return "Спиди";
  return value?.trim() || "—";
}

function labelDeliveryType(value: string | null) {
  if (value === "office") return "До офис";
  if (value === "address") return "До адрес";
  return value?.trim() || "—";
}

export function getStoreOrderEmailItems(order: OrderRow): StoreOrderEmailItem[] {
  return parseStoreOrderItems(order).map((item) => ({
    name: item.name,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    personalization: item.personalization,
    selectedColors: item.selectedColors,
    optionLines: item.optionSelections.map((group) => formatOrderOptionLine(group)),
  }));
}

function renderItemsHtml(order: OrderRow) {
  const items = getStoreOrderEmailItems(order);
  if (items.length === 0) {
    return `<p>${escapeHtml(order.product_name || "—")}</p>`;
  }

  return items
    .map((item) => {
      const colors = item.selectedColors
        .map((color) => `${color.fieldLabel || "Цвят"}: ${color.optionName || "—"}`)
        .join("<br />");
      const personalization = item.personalization
        ? `<p style="margin:8px 0 0;color:#5e5a54;">Персонализация: ${escapeHtml(item.personalization)}</p>`
        : "";
      const colorBlock = colors
        ? `<p style="margin:8px 0 0;color:#5e5a54;">${colors}</p>`
        : "";
      const optionBlock = item.optionLines.length
        ? `<p style="margin:8px 0 0;color:#5e5a54;">${item.optionLines.map((line) => escapeHtml(line)).join("<br />")}</p>`
        : "";

      return `
        <div style="border:1px solid #e4ddd4;border-radius:12px;padding:16px;margin:0 0 12px;">
          <p style="margin:0;font-weight:600;color:#2a2824;">${escapeHtml(item.name)}</p>
          <p style="margin:8px 0 0;color:#2a2824;">${item.quantity} × ${escapeHtml(formatOrderPrice(item.unitPrice, order.currency))}</p>
          ${personalization}
          ${colorBlock}
          ${optionBlock}
        </div>
      `;
    })
    .join("");
}

function renderDetailsRows(order: OrderRow) {
  const rows: Array<[string, string | null]> = [
    ["Клиент", order.customer_name],
    ["Телефон", order.customer_phone],
    ["Имейл", order.customer_email],
    ["Куриер", labelCourier(order.courier)],
    ["Доставка", labelDeliveryType(order.delivery_type)],
    ["Град", order.city],
    ["Офис", order.office_name],
    ["Адрес / детайли", order.delivery_details],
    ["Плащане", getPaymentMethodLabel(order.payment_method)],
    ["Бележка", order.note],
  ];

  return rows
    .flatMap(([label, value]) => {
      const normalized = value?.trim();
      if (!normalized) {
        return [];
      }

      return [`
        <tr>
          <td style="padding:8px 12px 8px 0;color:#5e5a54;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#2a2824;vertical-align:top;">${escapeHtml(normalized)}</td>
        </tr>
      `];
    })
    .join("");
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

export function buildAdminOrderEmail(order: OrderRow, adminOrdersUrl: string) {
  const orderLabel = order.id.slice(0, 8).toUpperCase();
  const body = `
    <p style="margin:0 0 16px;color:#2a2824;">
      <strong>Номер:</strong> ${escapeHtml(orderLabel)}<br />
      <strong>Дата:</strong> ${escapeHtml(formatOrderDate(order.created_at))}<br />
      <strong>Общо:</strong> ${escapeHtml(formatOrderPrice(order.total_price, order.currency))}
    </p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#2a2824;">Артикули</h2>
    ${renderItemsHtml(order)}
    <h2 style="margin:24px 0 12px;font-size:18px;color:#2a2824;">Данни за доставка</h2>
    <table style="width:100%;border-collapse:collapse;">${renderDetailsRows(order)}</table>
    <p style="margin:24px 0 0;">
      <a href="${escapeHtml(adminOrdersUrl)}" style="display:inline-block;background:#4d5c4a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">
        Отвори в админ панела
      </a>
    </p>
  `;

  return {
    subject: `Нова поръчка ${orderLabel} · ${order.customer_name}`,
    html: buildEmailShell(
      "Нова онлайн поръчка",
      "Получена е нова поръчка от магазина. Прегледайте детайлите по-долу.",
      body,
    ),
  };
}

export function buildCustomerOrderEmail(order: OrderRow) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  const orderLabel = order.id.slice(0, 8).toUpperCase();
  const body = `
    <p style="margin:0 0 16px;color:#2a2824;">
      <strong>Номер на поръчката:</strong> ${escapeHtml(orderLabel)}<br />
      <strong>Дата:</strong> ${escapeHtml(formatOrderDate(order.created_at))}<br />
      <strong>Общо:</strong> ${escapeHtml(formatOrderPrice(order.total_price, order.currency))}
    </p>
    <h2 style="margin:24px 0 12px;font-size:18px;color:#2a2824;">Вашите артикули</h2>
    ${renderItemsHtml(order)}
    <h2 style="margin:24px 0 12px;font-size:18px;color:#2a2824;">Доставка</h2>
    <table style="width:100%;border-collapse:collapse;">${renderDetailsRows(order)}</table>
    <p style="margin:24px 0 0;line-height:1.6;color:#5e5a54;">
      Ще се свържем с вас по телефон, за да потвърдим поръчката и срока за изработка.
      Доставката се заплаща отделно при куриера.
    </p>
    <p style="margin:16px 0 0;line-height:1.6;color:#5e5a54;">
      При въпроси пишете на
      <a href="mailto:${escapeHtml(siteConfig.business.email)}" style="color:#4d5c4a;">${escapeHtml(siteConfig.business.email)}</a>
      или се обадете на ${escapeHtml(siteConfig.business.phoneDisplay)}.
    </p>
    <p style="margin:16px 0 0;line-height:1.6;color:#5e5a54;">
      За отказ от договор (право на връщане в срок) вижте
      <a href="${escapeHtml(new URL("/withdrawal", siteUrl).toString())}" style="color:#4d5c4a;">формата за отказ от договор</a>.
      За рекламации вижте
      <a href="${escapeHtml(new URL("/returns", siteUrl).toString())}" style="color:#4d5c4a;">Връщане и рекламации</a>.
    </p>
  `;

  return {
    subject: `Потвърждение на поръчка ${orderLabel} · ${siteConfig.name}`,
    html: buildEmailShell(
      "Благодарим за поръчката",
      `${escapeHtml(order.customer_name)}, получихме вашата поръчка и ще я обработим с грижа.`,
      body,
    ),
  };
}
