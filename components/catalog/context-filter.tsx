import Link from "next/link";

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
};

export function ContextFilter({
  action,
  label,
  name,
  value,
  allLabel,
  options,
}: ContextFilterProps) {
  if (options.length === 0) {
    return null;
  }

  return (
    <form
      action={action}
      className="mt-5 flex flex-col gap-3 rounded-xl border border-boutique-line bg-boutique-paper p-4 sm:flex-row sm:items-end"
    >
      <label className="min-w-0 flex-1 text-sm font-semibold text-boutique-ink">
        {label}
        <select
          name={name}
          defaultValue={value}
          className="mt-2 w-full rounded-lg border border-boutique-line bg-white px-3 py-2.5 text-sm font-normal text-boutique-ink outline-none transition focus:border-boutique-sage"
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} ({option.count})
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-boutique-sage-deep px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-boutique-ink"
        >
          Приложи
        </button>
        {value ? (
          <Link
            href={action}
            className="rounded-lg border border-boutique-line bg-white px-4 py-2.5 text-sm font-semibold text-boutique-ink"
          >
            Изчисти
          </Link>
        ) : null}
      </div>
    </form>
  );
}
