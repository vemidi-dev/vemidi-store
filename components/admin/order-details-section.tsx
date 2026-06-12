import {
  formatOrderDate,
  formatOrderPrice,
  getCourierLabel,
  getDeliveryTypeLabel,
  getOrderItemCount,
  getOrderPersonalizationSummary,
  getOrderProductSummary,
  getOrderShortId,
  getOrderSourceLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  parseStoreOrderItems,
  type OrderRow,
} from "@/lib/admin/orders";
import { formatOrderOptionLine } from "@/lib/order-option-display";

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "—";
}

export function OrderDetailsSection({ order }: { order: OrderRow }) {
  const storeItems = parseStoreOrderItems(order);
  const itemCount = getOrderItemCount(order);

  return (
    <div className="space-y-5 text-sm">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Обобщение
        </h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Номер", getOrderShortId(order)],
            ["Дата", formatOrderDate(order.created_at)],
            ["Статус", getOrderStatusLabel(order.status)],
            ["Източник", getOrderSourceLabel(order)],
            ["Артикули", String(itemCount)],
            ["Обща сума", formatOrderPrice(order.total_price, order.currency)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                {label}
              </dt>
              <dd className="mt-1 break-words text-boutique-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Клиент
        </h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["Име", order.customer_name],
            ["Телефон", order.customer_phone],
            ["Имейл", valueOrDash(order.customer_email)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                {label}
              </dt>
              <dd className="mt-1 break-words text-boutique-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {storeItems.length > 0 ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Артикули от магазина
          </h4>
          <div className="mt-3 space-y-3">
            {storeItems.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className="rounded-lg border border-boutique-line bg-boutique-bg p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-semibold text-boutique-ink">{item.name}</p>
                  <p className="text-boutique-ink">
                    {item.quantity} × {formatOrderPrice(item.unitPrice, order.currency)}
                  </p>
                </div>
                {item.lineTotal != null ? (
                  <p className="mt-1 text-xs text-boutique-muted">
                    Ред общо: {formatOrderPrice(item.lineTotal, order.currency)}
                  </p>
                ) : null}
                {item.personalization ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs text-boutique-muted">
                    Персонализация: {item.personalization}
                  </p>
                ) : null}
                {item.personalizationFields.map((field, fieldIndex) => (
                  <p
                    key={fieldIndex}
                    className="mt-1 whitespace-pre-wrap break-words text-xs text-boutique-muted"
                  >
                    {field.label || "Поле"}: {field.value || "—"}
                  </p>
                ))}
                {item.selectedColors.map((color, colorIndex) => (
                  <p key={colorIndex} className="mt-1 text-xs text-boutique-muted">
                    {color.fieldLabel || "Цвят"}: {color.optionName || "—"}
                  </p>
                ))}
                {item.optionSelections.map((group, groupIndex) => (
                  <p key={groupIndex} className="mt-1 text-xs text-boutique-muted">
                    {formatOrderOptionLine(group)}
                  </p>
                ))}
                {item.optionDelta != null && item.optionDelta > 0 ? (
                  <p className="mt-1 text-xs text-boutique-muted">
                    Доплащане опции: {formatOrderPrice(item.optionDelta, order.currency)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Продукт
          </h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["Продукт", valueOrDash(order.kit_name || order.product_name)],
              ["Размер", valueOrDash(order.kit_size)],
              ["Оцветяване", valueOrDash(order.coloring)],
              [
                "Персонализация",
                order.personalization
                  ? valueOrDash(order.child_name)
                  : getOrderPersonalizationSummary(order) || "Не",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                  {label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap break-words text-boutique-ink">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
          Доставка и плащане
        </h4>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            ["Куриер", getCourierLabel(order.courier)],
            ["Доставка", getDeliveryTypeLabel(order.delivery_type)],
            ["Град", valueOrDash(order.city)],
            ["Офис", valueOrDash(order.office_name)],
            ["Адрес на офис", valueOrDash(order.office_address)],
            ["Адрес / детайли", valueOrDash(order.delivery_details)],
            ["Плащане", getPaymentMethodLabel(order.payment_method)],
            ["Продукти (обобщение)", getOrderProductSummary(order) || "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
                {label}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-boutique-ink">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {order.note ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Бележка
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-boutique-ink">
            {order.note}
          </p>
        </section>
      ) : null}
    </div>
  );
}
