import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { PRODUCT_CARD_BADGES } from "@/lib/product-card";

type ProductCardBadgeFieldProps = {
  defaultValue?: string | null;
};

export function ProductCardBadgeField({ defaultValue }: ProductCardBadgeFieldProps) {
  return (
    <label className="text-sm font-medium text-boutique-ink">
      Етикет на картата
      <select
        name={adminFormFields.product.cardBadge}
        defaultValue={defaultValue ?? ""}
        className={adminFieldClass}
      >
        <option value="">Без етикет</option>
        {PRODUCT_CARD_BADGES.map((badge) => (
          <option key={badge} value={badge}>
            {badge}
          </option>
        ))}
      </select>
      <p className={adminHelperClass}>
        Показва се над името в магазина. „Промо“ се добавя автоматично при активна промоция.
      </p>
    </label>
  );
}
