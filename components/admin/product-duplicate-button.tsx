"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { duplicateProduct } from "@/app/admin/actions";
import {
  DUPLICATE_COPY_IMAGES_FIELD,
  DUPLICATE_PRODUCT_CONFIRM_MESSAGE,
} from "@/lib/admin/duplicate-product";
import { adminFormFields } from "@/lib/admin/form-fields";

type ProductDuplicateButtonProps = {
  productId: string;
  productName: string;
  className?: string;
};

function DuplicateSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-boutique-sage-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Създаване..." : "Създай копие"}
    </button>
  );
}

export function ProductDuplicateButton({
  productId,
  productName,
  className = "",
}: ProductDuplicateButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        Дублирай
      </button>

      {open ? (
        <div
          role="presentation"
          className="fixed inset-0 z-50 grid place-items-center bg-boutique-ink/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`duplicate-product-title-${productId}`}
            className="w-full max-w-md rounded-2xl border border-boutique-line bg-white p-6 shadow-2xl"
          >
            <h2
              id={`duplicate-product-title-${productId}`}
              className="font-heading text-2xl text-boutique-ink"
            >
              Дублиране на продукт
            </h2>
            <p className="mt-3 text-sm leading-6 text-boutique-muted">
              {DUPLICATE_PRODUCT_CONFIRM_MESSAGE}
            </p>
            <p className="mt-2 text-sm font-medium text-boutique-ink">
              Оригинал: {productName}
            </p>

            <form action={duplicateProduct} className="mt-6 space-y-5">
              <input type="hidden" name={adminFormFields.common.tab} value="products" />
              <input type="hidden" name={adminFormFields.common.id} value={productId} />
              <label className="flex items-start gap-3 rounded-lg border border-boutique-line/70 bg-boutique-bg/60 p-3 text-sm text-boutique-ink">
                <input
                  type="checkbox"
                  name={DUPLICATE_COPY_IMAGES_FIELD}
                  value="true"
                  className="mt-0.5 h-4 w-4 rounded border-boutique-line text-boutique-accent"
                />
                <span>
                  <span className="font-medium">Копирай снимките от оригиналния продукт</span>
                  <span className="mt-1 block text-xs leading-5 text-boutique-muted">
                    По подразбиране копието се създава без снимки. Включете опцията, ако искате
                    отделни файлове в Storage за новия продукт.
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-boutique-line px-4 py-2 text-sm font-semibold text-boutique-ink"
                onClick={() => setOpen(false)}
              >
                Отказ
              </button>
              <DuplicateSubmitButton />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
