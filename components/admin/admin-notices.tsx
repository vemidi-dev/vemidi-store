import type { AdminData } from "@/lib/admin/data";

type AdminNoticesProps = {
  success: string;
  error: string;
  errors: AdminData["errors"];
};

const errorLabels: Record<keyof AdminData["errors"], string> = {
  products: "продукти",
  categories: "категории",
  productCategories: "връзки продукт-категория",
  colorGroups: "групи цветове",
  colorOptions: "цветови опции",
  productColorFields: "цветови полета",
  productColorFieldOptions: "избрани цветове",
  productImages: "продуктови галерии",
  personalizationFields: "полета за персонализация",
  wishTemplates: "готови пожелания",
  wishTemplateOccasions: "поводи за пожелания",
  productWishTemplates: "пожелания към продуктите",
  faqGroups: "FAQ групи",
  faqItems: "FAQ въпроси",
  productFaqGroups: "FAQ групи към продуктите",
  productFaqItems: "индивидуални FAQ въпроси към продуктите",
  homeFeaturedProducts: "избрани продукти за началната страница",
  relatedProducts: "свързани продукти",
  productUpsellOffers: "upsell предложения",
  productUpsellSettings: "upsell настройки",
  categoryRelatedCategories: "свързани категории",
  optionGroups: "универсални опции",
  optionValues: "стойности на опции",
  landingPages: "landing страници",
};

export function AdminNotices({ success, error, errors }: AdminNoticesProps) {
  const queryErrors = Object.entries(errors) as Array<
    [keyof AdminData["errors"], AdminData["errors"][keyof AdminData["errors"]]]
  >;

  return (
    <>
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm text-emerald-700">
          <p className="font-semibold">Успешно действие</p>
          <p className="mt-1">{success}</p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {queryErrors.map(([key, queryError]) =>
        queryError ? (
          <div
            key={key}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Грешка при зареждане на {errorLabels[key]}: {queryError.message}
          </div>
        ) : null,
      )}
    </>
  );
}
