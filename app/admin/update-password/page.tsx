import { redirect } from "next/navigation";

import { updateAdminPassword } from "@/app/admin/update-password/actions";
import { PageContainer } from "@/components/layout/page-container";
import { createClient } from "@/lib/supabase/server";

type UpdatePasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const inputClass =
  "mt-2 w-full rounded-lg border border-boutique-line bg-boutique-bg px-4 py-3 text-sm text-boutique-ink outline-none transition focus:border-boutique-accent/50";

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/admin/reset-password?error=Supabase не е конфигуриран.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/reset-password?error=Отворете валиден линк от имейла.");
  }

  const params = await searchParams;
  const error = firstValue(params.error);

  return (
    <section className="pb-24 pt-12">
      <PageContainer>
        <div className="mx-auto max-w-md rounded-xl border border-boutique-line bg-boutique-paper p-7 shadow-boutique-sm md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-boutique-accent">
            Админ достъп
          </p>
          <h1 className="mt-3 font-heading text-3xl text-boutique-ink">Нова парола</h1>
          <p className="mt-3 text-sm leading-relaxed text-boutique-muted">
            Задайте нова парола за {user.email}.
          </p>

          {error ? (
            <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <form action={updateAdminPassword} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-boutique-ink">
              Нова парола
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
            <label className="block text-sm font-medium text-boutique-ink">
              Повторете паролата
              <input
                name="confirmation"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-full bg-boutique-ink py-3 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent"
            >
              Запази новата парола
            </button>
          </form>
        </div>
      </PageContainer>
    </section>
  );
}
