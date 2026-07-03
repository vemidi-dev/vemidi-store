import { adminFormFields } from "@/lib/admin/form-fields";
import {
  PRODUCT_VISIBILITY_LABELS,
  normalizeProductVisibility,
  type ProductVisibility,
} from "@/lib/product-visibility";

type ProductVisibilityFieldProps = {
  defaultValue?: ProductVisibility | null;
  fieldClassName: string;
  helperClassName: string;
};

export function ProductVisibilityField({
  defaultValue,
  fieldClassName,
  helperClassName,
}: ProductVisibilityFieldProps) {
  const value = normalizeProductVisibility(defaultValue);

  return (
    <label className="text-sm font-medium text-boutique-ink">
      Видимост
      <select
        name={adminFormFields.product.visibility}
        defaultValue={value}
        className={fieldClassName}
      >
        <option value="public">{PRODUCT_VISIBILITY_LABELS.public}</option>
        <option value="upsell_only">
          {PRODUCT_VISIBILITY_LABELS.upsell_only}
        </option>
      </select>
      <p className={helperClassName}>
        „Само като добавка“ скрива продукта от каталога и директната продуктова
        страница, но го оставя наличен за upsell предложения.
      </p>
    </label>
  );
}
