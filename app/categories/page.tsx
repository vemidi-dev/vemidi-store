import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";

const categories = [
  {
    title: "Сватбени подаръци",
    description: "Табели, обети, номера на маси и детайли за тържеството.",
  },
  {
    title: "Дом и декор",
    description: "Стенно изкуство и персонализирани акценти за всекидневието.",
  },
  {
    title: "Подаръчни комплекти",
    description: "Внимателно подбрани комплекти за празници и юбилеи.",
  },
];

export default function CategoriesPage() {
  return (
    <div>
      <PageHero
        eyebrow="Каталог"
        title="Категории"
        description="Разгледайте тематичните ни линии. Скоро тук ще се филтрират продуктите от магазина."
      />
      <section className="pb-20 pt-4">
        <PageContainer>
          <div className="grid gap-8 md:grid-cols-3">
            {categories.map((c) => (
              <article
                key={c.title}
                className="rounded-2xl border border-boutique-line bg-boutique-paper p-8 shadow-boutique-sm"
              >
                <h2 className="font-heading text-xl text-boutique-ink">{c.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-boutique-muted">{c.description}</p>
              </article>
            ))}
          </div>
          <p className="mt-12 text-center text-sm text-boutique-muted">
            <Link href="/products" className="font-medium text-boutique-accent underline-offset-4 hover:underline">
              Към магазина
            </Link>
          </p>
        </PageContainer>
      </section>
    </div>
  );
}
