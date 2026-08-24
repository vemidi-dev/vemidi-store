"use client";

import type { ReactNode } from "react";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

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
  const { pending } = useFormStatus();

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
