import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductDetailAddToCart } from "@/components/product/product-detail-add-to-cart";
import { ProductDetailGallery } from "@/components/product/product-detail-gallery";
import { PageContainer } from "@/components/layout/page-container";
import { formatEur } from "@/lib/format-eur";
import type { ProductColorField } from "@/lib/product-colors";
import { createClient } from "@/lib/supabase/server";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let product: {
    slug: string;
    title: string;
    description: string;
    additionalInfo?: string | null;
    fulfillmentNote?: string | null;
    price: number;
    tag?: string;
    customizable?: boolean;
    colorFields?: ProductColorField[];
    images: { src: string; alt: string }[];
  } | null = null;

  const supabase = await createClient();
  if (supabase) {
    const { data: dbProduct } = await supabase
      .from("products")
      .select("*")
      .eq("id", slug)
      .maybeSingle();

    if (dbProduct) {
      const [{ data: groupsData }, { data: fieldsData }, { data: fieldOptionData }] = await Promise.all([
        supabase.from("color_groups").select("id,key,label"),
        supabase
          .from("product_color_fields")
          .select("id,group_id,label,enabled,min_select,max_select,sort_order")
          .eq("product_id", dbProduct.id)
          .eq("enabled", true),
        supabase
          .from("product_color_field_options")
          .select("field_id,color_option_id"),
      ]);

      const activeFields = (fieldsData ?? []).filter((field) => field.enabled);
      const groupIds = Array.from(new Set(activeFields.map((row) => row.group_id)));
      const fieldIds = activeFields.map((field) => field.id);
      const { data: allGroupOptions } =
        groupIds.length > 0
          ? await supabase
              .from("color_options")
              .select("id,group_id,name,hex,sort_order,is_active")
              .in("group_id", groupIds)
              .eq("is_active", true)
              .order("sort_order", { ascending: true })
          : { data: [] as Array<{
              id: string;
              group_id: string;
              name: string;
              hex: string | null;
              sort_order: number | null;
              is_active: boolean;
            }> };

      const groupsById = new Map((groupsData ?? []).map((group) => [group.id, group]));
      const selectedOptionIdsByField = new Map<string, Set<string>>();
      (fieldOptionData ?? [])
        .filter((row) => fieldIds.includes(row.field_id))
        .forEach((row) => {
        const set = selectedOptionIdsByField.get(row.field_id) ?? new Set<string>();
        set.add(row.color_option_id);
        selectedOptionIdsByField.set(row.field_id, set);
      });

      const optionsByGroup = new Map<string, Array<{ id: string; name: string; hex: string | null }>>();
      (allGroupOptions ?? []).forEach((option) => {
        const list = optionsByGroup.get(option.group_id) ?? [];
        list.push({ id: option.id, name: option.name, hex: option.hex });
        optionsByGroup.set(option.group_id, list);
      });

      const colorFields: ProductColorField[] = activeFields
        .sort((a, b) => {
          if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          }
          return a.label.localeCompare(b.label, "bg");
        })
        .map((field) => {
          const group = groupsById.get(field.group_id);
          if (!group) {
            return null;
          }
          const allOptionsForGroup = optionsByGroup.get(field.group_id) ?? [];
          const selectedOptionIds = selectedOptionIdsByField.get(field.id);
          const options =
            selectedOptionIds && selectedOptionIds.size > 0
              ? allOptionsForGroup.filter((option) => selectedOptionIds.has(option.id))
              : allOptionsForGroup;

          if (options.length === 0) {
            return null;
          }

          return {
            id: field.id,
            label: field.label,
            key: group.key,
            groupId: group.id,
            groupLabel: group.label,
            minSelect: Math.max(0, Number(field.min_select) || 0),
            maxSelect: Math.max(1, Number(field.max_select) || 1),
            options,
          };
        })
        .filter((field): field is ProductColorField => Boolean(field));

      product = {
        slug: dbProduct.id,
        title: dbProduct.name,
        description: dbProduct.description,
        additionalInfo: dbProduct.additional_info,
        fulfillmentNote: dbProduct.fulfillment_note,
        price: Number(dbProduct.price),
        customizable: dbProduct.is_customizable,
        colorFields,
        images: [
          {
            src:
              dbProduct.image_url ??
              "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80",
            alt: dbProduct.name,
          },
        ],
      };
    }
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-boutique-bg">
      <section className="border-b border-boutique-line/90 bg-boutique-paper">
        <PageContainer className="py-14 md:py-20 lg:py-24">
          <Link
            href="/products"
            className="inline-block text-xs font-semibold uppercase tracking-[0.22em] text-boutique-muted transition hover:text-boutique-accent"
          >
            ← Назад към магазина
          </Link>

          <div className="mt-14 grid gap-16 lg:mt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-20 xl:gap-24">
            <div className="lg:sticky lg:top-32 lg:self-start">
              <ProductDetailGallery images={product.images} />
            </div>

            <div className="flex flex-col pb-6 lg:py-4">
              <div className="space-y-6">
                {product.tag ? (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-accent">
                    {product.tag}
                  </p>
                ) : (
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-boutique-muted">
                    В ателието
                  </p>
                )}

                <h1 className="font-heading text-4xl leading-[1.12] tracking-tight text-boutique-ink sm:text-5xl lg:text-[2.75rem]">
                  {product.title}
                </h1>

                <p className="font-heading text-3xl tracking-tight text-boutique-ink/90 sm:text-4xl">
                  {formatEur(product.price)}
                </p>
              </div>

              <p className="mt-12 max-w-xl text-lg leading-[1.75] text-boutique-muted md:text-xl md:leading-[1.8]">
                {product.description}
              </p>
              {product.additionalInfo ? (
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-boutique-muted">
                  {product.additionalInfo}
                </p>
              ) : null}

              <ProductDetailAddToCart product={product} />

              <p className="mt-14 max-w-lg text-sm leading-relaxed text-boutique-muted md:mt-16">
                {product.fulfillmentNote ??
                  "Изпращане от ателието за 5-10 работни дни. При персонализация ще потвърдим текста по имейл преди изработка."}
              </p>
            </div>
          </div>
        </PageContainer>
      </section>
    </div>
  );
}
