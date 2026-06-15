import Link from "next/link";
import type { ReactNode } from "react";

type ContextFilterOption = {
  value: string;
  label: string;
  count: number;
};

type ContextFilterProps = {
  action: string;
  label: string;
  name: "occasion" | "product";
  value: string;
  allLabel: string;
  options: ContextFilterOption[];
  children: ReactNode;
};

export function ContextFilter({
  action,
  label,
  name,
  value,
  allLabel,
  options,
  children,
}: ContextFilterProps) {
  if (options.length === 0) {
    return <div className="mt-6">{children}</div>;
  }

  function FilterFields() {
    return (
      <>
        <fieldset className="border-t border-boutique-line pt-4 lg:pt-5">
          <legend className="font-heading text-base text-boutique-ink lg:text-lg">
            {label}
          </legend>
          <div className="mt-2.5 space-y-2 lg:mt-3 lg:space-y-2.5">
            <label className="flex items-center gap-2 text-sm text-boutique-muted">
              <input
                type="radio"
                name={name}
                value=""
                defaultChecked={!value}
                className="accent-boutique-sage-deep"
              />
              {allLabel}
            </label>
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-sm text-boutique-muted"
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  defaultChecked={value === option.value}
                  className="accent-boutique-sage-deep"
                />
                <span>
                  {option.label} ({option.count})
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-boutique-sage-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-accent lg:py-3"
          >
            Приложи
          </button>
          <Link
            href={action}
            className="rounded-lg border border-boutique-line px-4 py-2.5 text-sm font-semibold text-boutique-ink lg:py-3"
          >
            Изчисти
          </Link>
        </div>
      </>
    );
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div>
        <details className="rounded-xl border border-boutique-line bg-boutique-paper p-3 shadow-boutique-sm lg:hidden">
          <summary className="cursor-pointer py-0.5 font-semibold text-boutique-ink">
            Филтри
          </summary>
          <form action={action} className="mt-4 space-y-4">
            <FilterFields />
          </form>
        </details>

        <aside className="hidden lg:block">
          <form
            action={action}
            className="sticky top-28 space-y-5 rounded-xl border border-boutique-line bg-boutique-paper p-5 shadow-boutique-sm"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-xl text-boutique-ink">Филтри</h2>
              <Link
                href={action}
                className="text-xs text-boutique-sage-deep hover:underline"
              >
                Изчисти
              </Link>
            </div>
            <FilterFields />
          </form>
        </aside>
      </div>

      <div>{children}</div>
    </div>
  );
}
