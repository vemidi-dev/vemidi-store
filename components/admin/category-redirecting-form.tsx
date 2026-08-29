"use client";

import {
  createCategory,
  moveCategory,
  updateCategory,
} from "@/app/admin/actions";
import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type CategoryMutationKind = "create" | "update" | "move";

type CategoryRedirectingFormProps = {
  kind: CategoryMutationKind;
  children: ReactNode;
  className?: string;
  pendingMessage?: string;
};

const actions = {
  create: createCategory,
  update: updateCategory,
  move: moveCategory,
} as const;

/**
 * Full page assign after mutation — soft router refresh was leaving the
 * categories tab stuck on pending / stale RSC after revalidatePath("/admin").
 * Server actions are imported here (not passed as props) so the action
 * binding stays stable in the client bundle.
 */
export function CategoryRedirectingForm({
  kind,
  children,
  className,
  pendingMessage,
}: CategoryRedirectingFormProps) {
  const [error, setError] = useState<string | null>(null);
  const action = actions[kind];

  return (
    <form
      className={className}
      action={async (formData) => {
        setError(null);
        try {
          const result = await action(formData);
          if (!result?.href) {
            setError("Липсва адрес за пренасочване след записа.");
            return;
          }
          window.location.assign(result.href);
        } catch (caught) {
          // Auth helpers may throw NEXT_REDIRECT — let the framework navigate.
          if (
            typeof caught === "object" &&
            caught !== null &&
            "digest" in caught &&
            String((caught as { digest?: unknown }).digest ?? "").startsWith(
              "NEXT_REDIRECT",
            )
          ) {
            throw caught;
          }
          setError(
            caught instanceof Error
              ? caught.message
              : "Действието не беше завършено.",
          );
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
