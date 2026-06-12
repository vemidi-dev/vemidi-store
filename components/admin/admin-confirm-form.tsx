"use client";

import type { FormHTMLAttributes, ReactNode } from "react";

type AdminConfirmFormProps = FormHTMLAttributes<HTMLFormElement> & {
  confirmMessage: string;
  children: ReactNode;
};

export function AdminConfirmForm({
  confirmMessage,
  children,
  onSubmit,
  ...props
}: AdminConfirmFormProps) {
  return (
    <form
      {...props}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}
