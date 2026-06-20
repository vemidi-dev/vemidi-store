import { handleCampaignCheckoutOptions, handleCampaignCheckoutPost } from "@/lib/campaign-handoff-request";

export async function OPTIONS(request: Request) {
  return handleCampaignCheckoutOptions(request);
}

export async function POST(request: Request) {
  return handleCampaignCheckoutPost(request);
}
