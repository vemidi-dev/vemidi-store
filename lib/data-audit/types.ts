export type AuditSeverity = "critical" | "warning" | "info";

export type AuditIssue = {
  severity: AuditSeverity;
  code: string;
  message: string;
};

export type AuditProductRow = {
  id: string;
  slug: string | null;
  name: string;
  subtitle: string | null;
  status: string;
  primary_category_id: string | null;
  image_url: string | null;
};

export type AuditCategoryRow = {
  id: string;
  slug: string;
  category_type: string;
  parent_id: string | null;
  is_visible?: boolean | null;
};

export type AuditCategoryRelatedRow = {
  category_id: string;
  related_category_id: string;
  sort_order?: number;
};

export type AuditDataset = {
  products: AuditProductRow[];
  productCategories: Array<{ product_id: string; category_id: string }>;
  productImages: Array<{ product_id: string }>;
  personalizationFields: Array<{
    product_id: string;
    allows_wish_templates: boolean;
  }>;
  productWishTemplates: Array<{
    product_id: string;
    wish_template_id: string;
  }>;
  wishTemplates: Array<{ id: string; is_active: boolean }>;
  categories: AuditCategoryRow[];
  categoryRelatedCategories: AuditCategoryRelatedRow[] | null;
  productFaqGroups: Array<{ product_id: string; group_id: string }> | null;
  productFaqItems: Array<{ product_id: string; faq_item_id: string }> | null;
  faqGroups: Array<{ id: string }> | null;
  faqItems: Array<{ id: string }> | null;
};

export type AuditReport = {
  issues: AuditIssue[];
  stats: Record<string, number>;
};
