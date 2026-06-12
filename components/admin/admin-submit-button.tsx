"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type AdminSubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
};

export function AdminSubmitButton({
  children,
  pendingLabel = "Качване…",
  className,
}: AdminSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
