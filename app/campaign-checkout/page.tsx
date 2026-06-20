import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CampaignCheckoutBridge } from "@/components/campaign/campaign-checkout-bridge";
import { CampaignCheckoutError } from "@/components/campaign/campaign-checkout-error";
import { PageContainer } from "@/components/layout/page-container";
import {
  buildCampaignHandoffSignature,
  evaluateCampaignHandoff,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import { CAMPAIGN_HANDOFF_COOKIE_NAME } from "@/lib/campaign-handoff-cookie-config";
import { consumeCampaignHandoffCookie } from "@/lib/campaign-handoff-consume";
import { hasCampaignHandoffQueryParams } from "@/lib/middleware/campaign-checkout-handoff";
import { getStorefrontProduct } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Към завършване на поръчката",
  robots: { index: false, follow: false },
};

type CampaignCheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function renderCheckoutBridge(
  result: Extract<
    Awaited<ReturnType<typeof evaluateCampaignHandoff>>,
    { status: "ready" }
  >,
) {
  const handoffSignature = buildCampaignHandoffSignature(result);

  return (
    <section className="pb-24 pt-10">
      <PageContainer className="mx-auto max-w-2xl">
        <CampaignCheckoutBridge
          attribution={result.attribution}
          handoffSignature={handoffSignature}
          personalization={result.personalization}
          personalizationFields={result.personalizationFields}
          product={result.product}
          quantity={result.quantity}
          selectedColors={result.selectedColors}
          optionSelections={result.optionSelections}
        />
      </PageContainer>
    </section>
  );
}

export default async function CampaignCheckoutPage({
  searchParams,
}: CampaignCheckoutPageProps) {
  const params = await searchParams;
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        queryParams.append(key, entry);
      }
      continue;
    }
    if (value !== undefined) {
      queryParams.set(key, value);
    }
  }

  const hasLegacyQueryHandoff = hasCampaignHandoffQueryParams(queryParams);
  const cookieStore = await cookies();
  const sealedCookie = cookieStore.get(CAMPAIGN_HANDOFF_COOKIE_NAME)?.value;
  const shouldConsumeCookie = Boolean(sealedCookie) && !hasLegacyQueryHandoff;

  if (shouldConsumeCookie) {
    const consumed = await consumeCampaignHandoffCookie(
      sealedCookie,
      getStorefrontProduct,
    );

    if (!consumed.ok) {
      return (
        <section className="pb-24 pt-10">
          <PageContainer className="mx-auto max-w-2xl">
            <CampaignCheckoutError
              message={consumed.message}
              title={consumed.title}
            />
          </PageContainer>
        </section>
      );
    }

    return renderCheckoutBridge(consumed.result);
  }

  const query = parseCampaignHandoffQuery(params);
  const product = query.productId ? await getStorefrontProduct(query.productId) : null;
  const result = evaluateCampaignHandoff(product, query);

  if (result.status === "invalid") {
    return (
      <section className="pb-24 pt-10">
        <PageContainer className="mx-auto max-w-2xl">
          <CampaignCheckoutError message={result.message} title={result.title} />
        </PageContainer>
      </section>
    );
  }

  if (result.status === "needs_configuration") {
    redirect(result.redirectPath);
  }

  return renderCheckoutBridge(result);
}
