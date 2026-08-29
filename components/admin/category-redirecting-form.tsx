"use client";

import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

type CategoryRedirectingFormProps = {
  action: (formData: FormData) => Promise<{ href: string }>;
  children: ReactNode;
  className?: string;
  pendingMessage?: string;
};

export function CategoryRedirectingForm({
  action,
  children,
  className,
  pendingMessage = "Моля, изчакайте…",
}: CategoryRedirectingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <form
      className={className}
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            const result = await action(formData);
            router.push(result.href);
            router.refresh();
          } catch (caught) {
            if (isRedirectError(caught)) {
              throw caught;
            }
            const message =
              caught instanceof Error
                ? caught.message
                : "Действието не беше завършено.";
            if (mountedRef.current) {
              setError(message);
            }
          }
        });
      }}
    >
      {children}
      {isPending && pendingMessage ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {pendingMessage}
        </p>
      ) : null}
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
