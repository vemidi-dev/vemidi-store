import Link from "next/link";

import { requestAdminPasswordReset } from "@/app/admin/reset-password/actions";
import { PageContainer } from "@/components/layout/page-container";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const inputClass =
  "mt-2 w-full rounded-lg border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition focus:border-boutique-accent/50";

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const error = firstValue(params.error);
  const success = firstValue(params.success);

  return (
    <section className="pb-24 pt-12">
      <PageContainer>
        <div className="mx-auto max-w-md rounded-xl border border-boutique-line bg-boutique-paper p-7 shadow-boutique-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
            Админ достъп
          </p>
          <h1 className="mt-3 font-heading text-3xl text-boutique-ink">
            Възстановяване на парола
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
            Въведете имейла на администратора. Линкът ще ви върне към този магазин.
          </p>

          {error ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <form action={requestAdminPasswordReset} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-boutique-ink">
              Имейл
              <input name="email" type="email" required className={inputClass} />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-boutique-ink py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
            >
              Изпрати линк
            </button>
          </form>

          <Link
            href="/admin/login"
            className="mt-5 inline-flex text-xs font-semibold uppercase tracking-wider text-boutique-muted transition hover:text-boutique-ink"
          >
            Обратно към входа
          </Link>
        </div>
      </PageContainer>
    </section>
  );
}
