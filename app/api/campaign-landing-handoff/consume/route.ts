import {
  handleCampaignLandingHandoffConsumeGet,
  handleCampaignLandingHandoffConsumeOptions,
} from "@/lib/campaign-landing-handoff-request";

export async function OPTIONS(request: Request) {
  return handleCampaignLandingHandoffConsumeOptions(request);
}

export async function GET(request: Request) {
  return handleCampaignLandingHandoffConsumeGet(request);
}
