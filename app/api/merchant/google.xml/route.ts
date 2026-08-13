import { NextResponse } from "next/server";

import {
  buildGoogleMerchantFeedXml,
  GOOGLE_MERCHANT_FEED_CONTENT_TYPE,
} from "@/lib/merchant/google-feed";
import { getSiteUrl } from "@/lib/site-url";
import { getStorefrontCatalog } from "@/lib/storefront/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const siteUrl = getSiteUrl();
  const catalog = await getStorefrontCatalog();

  const xml = buildGoogleMerchantFeedXml({
    siteUrl,
    products: catalog.products,
    categories: catalog.categories,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": GOOGLE_MERCHANT_FEED_CONTENT_TYPE,
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
