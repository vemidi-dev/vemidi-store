import { adminFormFields } from "@/lib/admin/form-fields";
import {
  PRODUCT_PUBLICATION_STATUSES,
  PRODUCT_PUBLICATION_STATUS_LABELS,
  type ProductPublicationStatus,
} from "@/lib/product-publication";

type ProductPublicationStatusFieldProps = {
  defaultValue?: ProductPublicationStatus;
  fieldClassName: string;
  helperClassName?: string;
  disabled?: boolean;
};

export function ProductPublicationStatusField({
  defaultValue = "draft",
  fieldClassName,
  helperClassName,
  disabled = false,
}: ProductPublicationStatusFieldProps) {
  return (
    <label className="text-sm font-medium text-boutique-ink">
      Статус на публикация
      <select
        name={adminFormFields.product.status}
        defaultValue={defaultValue}
        disabled={disabled}
        className={`${fieldClassName} mt-1`}
      >
        {PRODUCT_PUBLICATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {PRODUCT_PUBLICATION_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {helperClassName ? (
        <span className={`${helperClassName} mt-1 block`}>
          Черновите и архивираните продукти не се виждат в магазина.
        </span>
      ) : null}
    </label>
  );
}
