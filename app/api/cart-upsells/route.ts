import { NextResponse } from "next/server";

import { getActiveProductUpsellOffers } from "@/lib/storefront/product-upsells";
import { createClient } from "@/lib/supabase/server";

type CartUpsellsRequest = {
  productIds?: unknown;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as CartUpsellsRequest;
  const productIds = Array.isArray(body.productIds)
    ? [...new Set(body.productIds.map(String).filter(Boolean))].slice(0, 20)
    : [];

  if (productIds.length === 0) {
    return NextResponse.json({ offersByProductId: {} });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ offersByProductId: {} });
  }

  const entries = await Promise.all(
    productIds.map(async (productId) => [
      productId,
      await getActiveProductUpsellOffers(supabase, productId),
    ]),
  );

  return NextResponse.json({
    offersByProductId: Object.fromEntries(
      entries.filter(([, offers]) => offers.length > 0),
    ),
  });
}
