"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type CategoryRedirectingFormProps = {
  action: (formData: FormData) => Promise<{ href: string }>;
  children: ReactNode;
  className?: string;
  pendingMessage?: string;
};

/**
 * Category create/update/move must navigate via returned href + refresh.
 * Server `redirect()` after these actions often does not remount the
 * lightweight `/admin?tab=categories` RSC tree in the browser.
 */
export function CategoryRedirectingForm({
  action,
  children,
  className,
  pendingMessage,
}: CategoryRedirectingFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={className}
      action={async (formData) => {
        setError(null);
        try {
          const result = await action(formData);
          router.push(result.href);
          router.refresh();
        } catch (caught) {
          const message =
            caught instanceof Error
              ? caught.message
              : "Действието не беше завършено.";
          setError(message);
        }
      }}
    >
      {children}
      {pendingMessage ? <PendingMessage message={pendingMessage} /> : null}
      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

function PendingMessage({ message }: { message: string }) {
  const { pending } = useFormStatus();
  if (!pending) {
    return null;
  }
  return (
    <p
      role="status"
      aria-live="polite"
      className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      {message}
    </p>
  );
}
