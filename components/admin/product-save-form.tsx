"use client";

import { useEffect, useRef, useState, useTransition, type ComponentProps } from "react";
import { ProductFormPendingContext } from "@/components/admin/product-form-status";
import { validateProductCreateColorFieldsClient } from "@/lib/admin/product-create-local-draft";
import type { ProductFormResult } from "@/lib/admin/product-form-result";

type Props = Omit<ComponentProps<"form">, "action"> & {
  action: (data: FormData) => Promise<ProductFormResult>;
  fieldsClassName?: string;
};

export function ProductSaveForm({ action, children, onSubmit, fieldsClassName = "contents", ...props }: Props) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  const notice = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) notice.current?.focus();
  }, [error]);

  return <ProductFormPendingContext.Provider value={pending}>
    <form {...props} aria-busy={pending} onSubmit={(event) => {
      if (submitting.current) { event.preventDefault(); return; }
      onSubmit?.(event);
      const cancelled = event.defaultPrevented;
      event.preventDefault();
      if (cancelled) return;
      const form = event.currentTarget;
      const failed = (message: string) => {
        setError(message);
        form.dispatchEvent(new Event("admin-product-save-failed"));
      };
      const data = new FormData(form);
      const colorError = validateProductCreateColorFieldsClient(data);
      if (colorError) { failed(colorError); return; }
      setError("");
      submitting.current = true;
      // A manual submit avoids React resetting uncontrolled fields on a failed action.
      startTransition(async () => {
        try {
          const result = await action(data);
          if (result.error) failed(result.error);
        } catch (cause) {
          if (cause && typeof cause === "object" && "digest" in cause && String(cause.digest).startsWith("NEXT_REDIRECT")) throw cause;
          failed("Не получихме потвърждение за записа. Данните остават във формата. Проверете връзката и опитайте отново.");
        } finally {
          submitting.current = false;
        }
      });
    }}>
      <fieldset disabled={pending} className={fieldsClassName}>{children}</fieldset>
      {error ? <p ref={notice} tabIndex={-1} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 md:col-span-2">{error}</p> : null}
    </form>
  </ProductFormPendingContext.Provider>;
}
