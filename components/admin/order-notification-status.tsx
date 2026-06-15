import {
  getOrderNotificationBadgeClass,
  getOrderNotificationChannelLabel,
  getOrderNotificationOverallLabel,
  type OrderNotificationSummary,
} from "@/lib/admin/order-notifications";

type OrderNotificationStatusProps = {
  summary?: OrderNotificationSummary;
};

export function OrderNotificationStatus({ summary }: OrderNotificationStatusProps) {
  if (!summary) {
    return (
      <p className="text-xs text-boutique-muted">
        Имейл статус: няма запис (миграцията може да не е приложена).
      </p>
    );
  }

  const overall = getOrderNotificationOverallLabel(summary);

  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-boutique-muted">
        Имейл известия
      </h4>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${getOrderNotificationBadgeClass(
            summary.admin === "failed" || summary.customer === "failed"
              ? "failed"
              : summary.admin === "pending" || summary.customer === "pending"
                ? "pending"
                : summary.admin === "sent" || summary.customer === "sent"
                  ? "sent"
                  : "skipped",
          )}`}
        >
          {overall}
        </span>
        <span className="text-xs text-boutique-muted">
          {getOrderNotificationChannelLabel("admin", summary.admin)}
        </span>
        <span className="text-xs text-boutique-muted">
          {getOrderNotificationChannelLabel("customer", summary.customer)}
        </span>
      </div>
    </section>
  );
}
