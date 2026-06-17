import Link from "next/link";

export function CampaignCheckoutError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-boutique-line bg-boutique-paper px-8 py-14 text-center shadow-boutique-sm">
      <h1 className="font-heading text-3xl text-boutique-ink">{title}</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-boutique-muted">
        {message}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/producti"
          className="rounded-full bg-boutique-ink px-6 py-3 text-sm font-semibold text-boutique-paper transition hover:bg-boutique-accent"
        >
          Към магазина
        </Link>
        <Link
          href="/cart"
          className="rounded-full border border-boutique-line px-6 py-3 text-sm font-semibold text-boutique-ink transition hover:border-boutique-accent/40"
        >
          Количка
        </Link>
      </div>
    </div>
  );
}
