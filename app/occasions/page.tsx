import type { Metadata } from "next";
import CategoryShowcaseCard from "@/components/category/category-showcase-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHero } from "@/components/ui/page-hero";
import { toShowcaseCategory } from "@/lib/storefront/mappers";
import { getStorefrontCategories } from "@/lib/storefront/repository";

export const metadata: Metadata = { title: "Подаръци по повод", description: "Изберете подарък според повода.", alternates: { canonical: "/occasions" } };
export default async function OccasionsPage() {
  const categories = (await getStorefrontCategories()).map(toShowcaseCategory);
  return <div><PageHero eyebrow="Подари ми спомен" title="Подаръци по повод" description="Изберете повод и разгледайте подходящите персонализирани идеи." /><section className="pb-24 pt-10"><PageContainer><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{categories.map(category => <CategoryShowcaseCard key={category.slug} category={category} />)}</div></PageContainer></section></div>;
}
