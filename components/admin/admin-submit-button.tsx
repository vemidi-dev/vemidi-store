"use client";

import type { ReactNode } from "react";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { useProductFormPending } from "@/components/admin/product-form-status";

type AdminSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function AdminSubmitButton({
  children,
  pendingLabel = "Качване…",
  className,
  disabled,
  ...props
}: AdminSubmitButtonProps) {
  const { pending: nativePending } = useFormStatus();
  const pending = useProductFormPending() || nativePending;

  return (
    <button
      {...props}
      type="submit"
      disabled={pending || disabled}
      className={className}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
