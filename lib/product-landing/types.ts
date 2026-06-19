export type ProductLandingPageRow = {
  id: string;
  product_id: string;
  title: string;
  slug: string;
  campaign_code: string | null;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ProductLandingPage = {
  id: string;
  productId: string;
  title: string;
  slug: string;
  campaignCode: string | null;
  isPrimary: boolean;
  isActive: boolean;
  sortOrder: number;
};
