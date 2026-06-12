"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";

type AdminFormPendingGuardProps = {
  message?: string;
};

export function AdminFormPendingGuard({
  message = "Обработване и качване на изображенията… Моля, не затваряйте страницата.",
}: AdminFormPendingGuardProps) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!pending) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pending]);

  if (!pending) {
    return null;
  }

  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {message}
    </p>
  );
}
