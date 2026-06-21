import {
  handleCampaignLandingHandoffOptions,
  handleCampaignLandingHandoffPost,
} from "@/lib/campaign-landing-handoff-request";

export async function OPTIONS() {
  return handleCampaignLandingHandoffOptions();
}

export async function POST(request: Request) {
  return handleCampaignLandingHandoffPost(request);
}
