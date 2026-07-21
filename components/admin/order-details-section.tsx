import Link from "next/link";

import {
  formatOrderDate,
  formatOrderPrice,
  getCourierLabel,
  getDeliveryTypeLabel,
  getLandingOrderColoringLabel,
  getOrderItemCount,
  getOrderItemProductCode,
  getOrderItemProductPath,
  getOrderPersonalizationSummary,
  getOrderProductSummary,
  getOrderShortId,
  getOrderSourceLabel,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  isLandingOnlyOrder,
  parseStoreOrderItems,
  type OrderRow,
} from "@/lib/admin/orders";
import {
  buildStoreOrderItemDetailLines,
  shouldShowOrderPersonalizationSummary,
} from "@/lib/admin/order-item-display";
import type { OrderNotificationSummary } from "@/lib/admin/order-notifications";
import { OrderNotificationStatus } from "@/components/admin/order-notification-status";
import { extractOrderCouponSummary } from "@/lib/checkout/coupon";

function valueOrDash(value: string | null | undefined) {
  return value?.trim() || "—";
}

export function OrderDetailsSection({
  order,
  notificationSummary,
}: {
  order: OrderRow;
  notificationSummary?: OrderNotificationSummary;
}) {
  const storeItems = parseStoreOrderItems(order);
  const itemCount = getOrderItemCount(order);
  const personalizationSummary = getOrderPersonalizationSummary(order);
  const couponSummary = extractOrderCouponSummary(order.raw_payload);

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

      {couponSummary ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Купон за отстъпка
          </h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Код", couponSummary.couponCode],
              [
                "Процент",
                couponSummary.discountPercentage != null
                  ? `${couponSummary.discountPercentage}%`
                  : "—",
              ],
              [
                "Преди отстъпка",
                couponSummary.subtotalPrice != null
                  ? formatOrderPrice(couponSummary.subtotalPrice, order.currency)
                  : "—",
              ],
              [
                "Отстъпка",
                couponSummary.discountAmount != null
                  ? formatOrderPrice(couponSummary.discountAmount, order.currency)
                  : "—",
              ],
              [
                "След отстъпка",
                couponSummary.totalPrice != null
                  ? formatOrderPrice(couponSummary.totalPrice, order.currency)
                  : formatOrderPrice(order.total_price, order.currency),
              ],
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
      ) : null}

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
            {storeItems.map((item, index) => {
              const productCode = getOrderItemProductCode(item);
              const productPath = getOrderItemProductPath(item);

              return (
                <div
                  key={`${item.productId ?? item.name}-${index}`}
                  className="rounded-lg border border-boutique-line bg-boutique-bg p-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-boutique-ink">{item.name}</p>
                    <p className="text-boutique-ink">
                      {item.quantity} × {formatOrderPrice(item.unitPrice, order.currency)}
                    </p>
                  </div>
                  {productCode ? (
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                      <span
                        className="break-all font-mono text-boutique-muted"
                        title={item.productId ?? undefined}
                      >
                        Код: {productCode}
                      </span>
                      {productPath ? (
                        <Link
                          href={productPath}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-boutique-accent underline decoration-boutique-accent/40 underline-offset-4 hover:text-boutique-ink"
                        >
                          Отвори продукта
                        </Link>
                      ) : (
                        <span className="text-boutique-muted">
                          Продуктът вече не е наличен
                        </span>
                      )}
                    </div>
                  ) : null}
                  {item.lineTotal != null ? (
                    <p className="mt-1 text-xs text-boutique-muted">
                      Ред общо: {formatOrderPrice(item.lineTotal, order.currency)}
                    </p>
                  ) : null}
                  {buildStoreOrderItemDetailLines(item).map((line, lineIndex) => (
                    <p
                      key={lineIndex}
                      className="mt-1 whitespace-pre-wrap break-words text-xs text-boutique-muted"
                    >
                      {line.text}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ) : isLandingOnlyOrder(order) ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Продукт (лендинг)
          </h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["Продукт", valueOrDash(order.kit_name || order.product_name)],
              ["Размер", valueOrDash(order.kit_size)],
              ["Оцветяване", getLandingOrderColoringLabel(order.coloring)],
              [
                "Персонализация",
                order.personalization
                  ? valueOrDash(order.child_name || "Да")
                  : "Не",
              ],
              ["Количество", "1"],
              ["Ред общо", formatOrderPrice(order.total_price, order.currency)],
              ["Източник / кампания", getOrderSourceLabel(order)],
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
      ) : (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Продукт
          </h4>
          <p className="mt-2 text-boutique-ink">
            {getOrderProductSummary(order) || "—"}
          </p>
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
            ["Плащане", getPaymentMethodLabel(order.payment_method)],
            ["Населено място", valueOrDash(order.city)],
            ["Адрес / офис", valueOrDash(order.delivery_details || order.office_name)],
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

      {shouldShowOrderPersonalizationSummary(storeItems.length, personalizationSummary) ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Персонализация
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-boutique-ink">
            {personalizationSummary}
          </p>
        </section>
      ) : null}

      {order.note ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
            Бележка
          </h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-boutique-ink">{order.note}</p>
        </section>
      ) : null}

      <OrderNotificationStatus summary={notificationSummary} />
    </div>
  );
}
