"use client";

import { useEffect, useRef, useState } from "react";

import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";
import { suggestProductSlugFromName } from "@/lib/product-slug";

type ProductSeoFieldsProps = {
  nameFieldId?: string;
  initialSlug?: string;
  productCode?: string | null;
  mode: "create" | "edit";
  helperClassName?: string;
  fieldClassName?: string;
};

export function ProductSeoFields({
  nameFieldId = adminFormFields.product.name,
  initialSlug = "",
  productCode = null,
  mode,
  helperClassName = adminHelperClass,
  fieldClassName = adminFieldClass,
}: ProductSeoFieldsProps) {
  const [slug, setSlug] = useState(initialSlug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initialSlug));
  const slugTouchedRef = useRef(slugTouched);

  useEffect(() => {
    slugTouchedRef.current = slugTouched;
  }, [slugTouched]);

  useEffect(() => {
    const nameInput = document.querySelector<HTMLInputElement>(
      `input[name="${nameFieldId}"]`,
    );
    if (!nameInput) {
      return;
    }

    const syncSlugFromName = () => {
      if (slugTouchedRef.current) {
        return;
      }
      setSlug(suggestProductSlugFromName(nameInput.value));
    };

    nameInput.addEventListener("input", syncSlugFromName);
    return () => nameInput.removeEventListener("input", syncSlugFromName);
  }, [nameFieldId]);

  return (
    <fieldset className="space-y-4">
      <legend className="text-xs font-semibold uppercase tracking-[0.16em] text-boutique-muted">
        SEO и продуктов код
      </legend>

      <label className="text-sm font-medium text-boutique-ink">
        SEO адрес
        <input
          name={adminFormFields.product.slug}
          value={slug}
          required
          maxLength={80}
          className={fieldClassName}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
        <p className={helperClassName}>
          Краен адрес:{" "}
          <span className="font-mono text-boutique-ink">
            /produkti/{slug || "primерен-slug"}
          </span>
        </p>
      </label>

      {mode === "edit" && productCode ? (
        <label className="text-sm font-medium text-boutique-ink">
          Продуктов код
          <input
            value={productCode}
            readOnly
            className={`${fieldClassName} bg-boutique-bg text-boutique-muted`}
          />
          <p className={helperClassName}>
            Кодът се генерира автоматично и не може да бъде променян.
          </p>
        </label>
      ) : (
        <p className={helperClassName}>
          Продуктовият код (напр. VM-000123) ще бъде генериран автоматично при запис.
        </p>
      )}
    </fieldset>
  );
}
