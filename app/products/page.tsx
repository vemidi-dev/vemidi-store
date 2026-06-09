import { redirect } from "next/navigation";

type ProductsPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    product?: string | string[];
    occasion?: string | string[];
  }>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : Array.isArray(value) ? value[0] ?? "" : "";
  const product = first(params.product);
  const occasion = first(params.occasion);
  const category = first(params.category);
  const queryParams = new URLSearchParams();
  if (product) queryParams.set("product", product);
  if (occasion) queryParams.set("occasion", occasion);
  if (!product && !occasion && category) queryParams.set("category", category);
  const query = queryParams.size ? `?${queryParams.toString()}#product-grid` : "";
  redirect(`/shop${query}`);
}
