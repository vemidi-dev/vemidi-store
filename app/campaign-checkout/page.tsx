import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CampaignCheckoutBridge } from "@/components/campaign/campaign-checkout-bridge";
import { CampaignCheckoutError } from "@/components/campaign/campaign-checkout-error";
import { PageContainer } from "@/components/layout/page-container";
import {
  buildCampaignHandoffSignature,
  evaluateCampaignHandoff,
  parseCampaignHandoffQuery,
} from "@/lib/campaign-handoff";
import { getStorefrontProduct } from "@/lib/storefront/repository";

export const metadata: Metadata = {
  title: "Към завършване на поръчката",
  robots: { index: false, follow: false },
};

type CampaignCheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CampaignCheckoutPage({
  searchParams,
}: CampaignCheckoutPageProps) {
  const query = parseCampaignHandoffQuery(await searchParams);
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
