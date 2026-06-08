import { redirect } from "next/navigation";

type ProductsPageProps = {
  searchParams: Promise<{ category?: string | string[] }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const rawCategory = params.category;
  const category =
    typeof rawCategory === "string"
      ? rawCategory
      : Array.isArray(rawCategory)
        ? rawCategory[0]
        : "";

  const query = category
    ? `?category=${encodeURIComponent(category)}#product-grid`
    : "";
  redirect(`/shop${query}`);
}
