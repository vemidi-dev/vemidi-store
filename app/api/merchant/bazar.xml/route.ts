import { NextResponse } from "next/server";

import {
  BAZAR_MERCHANT_FEED_CONTENT_TYPE,
  buildBazarMerchantFeedXml,
} from "@/lib/merchant/bazar-feed";
import { getSiteUrl } from "@/lib/site-url";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = getSiteUrl();
  const catalog = await getStorefrontCatalog();

  const xml = buildBazarMerchantFeedXml({
    siteUrl,
    products: catalog.products,
    categories: catalog.categories,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": BAZAR_MERCHANT_FEED_CONTENT_TYPE,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
