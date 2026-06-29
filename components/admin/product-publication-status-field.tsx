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
  helperText?: string;
  disabled?: boolean;
  allowedStatuses?: readonly ProductPublicationStatus[];
};

export function ProductPublicationStatusField({
  defaultValue = "draft",
  fieldClassName,
  helperClassName,
  helperText = "Черновите и архивираните продукти не се виждат в магазина.",
  disabled = false,
  allowedStatuses = PRODUCT_PUBLICATION_STATUSES,
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
        {allowedStatuses.map((status) => (
          <option key={status} value={status}>
            {PRODUCT_PUBLICATION_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {helperClassName ? (
        <span className={`${helperClassName} mt-1 block`}>
          {helperText}
        </span>
      ) : null}
    </label>
  );
}
