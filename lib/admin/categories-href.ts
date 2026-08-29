export function makeAdminCategoriesHref(
  partial: Partial<{
    categoryType: string;
    success: string;
    error: string;
    editCategory: string;
    refresh?: boolean;
  }> = {},
) {
  const params = new URLSearchParams();
  params.set("tab", "categories");
  if (partial.refresh || partial.success || partial.error) {
    params.set("_refresh", Date.now().toString());
  }

  if (partial.categoryType) {
    params.set("categoryType", partial.categoryType);
  }
  if (partial.success) {
    params.set("success", partial.success);
  }
  if (partial.error) {
    params.set("error", partial.error);
  }
  if (partial.editCategory) {
    params.set("editCategory", partial.editCategory);
  }

  return `/admin?${params.toString()}`;
}
