import {
  buildCampaignHandoffSignature,
  evaluateCampaignHandoff,
  type CampaignHandoffResult,
} from "@/lib/campaign-handoff";
import {
  getCampaignHandoffSecret,
  openCampaignHandoffPayload,
  signaturesMatch,
} from "@/lib/campaign-handoff-cookie";
import { handoffQueryFromStoredFields } from "@/lib/campaign-handoff-post";
import type { Product } from "@/lib/catalog";

export type CampaignHandoffConsumeResult =
  | {
      ok: true;
      result: Extract<CampaignHandoffResult, { status: "ready" }>;
      handoffSignature: string;
    }
  | {
      ok: false;
      title: string;
      message: string;
    };

export async function consumeCampaignHandoffCookie(
  sealed: string | undefined,
  getProduct: (productId: string) => Promise<Product | null>,
): Promise<CampaignHandoffConsumeResult> {
  if (!sealed) {
    return {
      ok: false,
      title: "Липсва handoff",
      message:
        "Не намерихме валидна кампанийна конфигурация. Моля, опитай отново от landing страницата.",
    };
  }

  const secret = getCampaignHandoffSecret();
  const opened = openCampaignHandoffPayload(sealed, secret);
  if (!opened.ok) {
    const message =
      opened.reason === "expired"
        ? "Кампанийната връзка е изтекла. Моля, върни се към landing страницата и опитай отново."
        : "Кампанийната връзка е невалидна. Моля, опитай отново от landing страницата.";

    return {
      ok: false,
      title: "Невалидна кампанийна връзка",
      message,
    };
  }

  const query = handoffQueryFromStoredFields(opened.payload.fields);
  const product = query.productId ? await getProduct(query.productId) : null;
  const evaluation = evaluateCampaignHandoff(product, query);

  if (evaluation.status !== "ready") {
    return {
      ok: false,
      title: "Невалидна кампанийна връзка",
      message:
        evaluation.status === "invalid"
          ? evaluation.message
          : "Избраната конфигурация изисква допълнителни стъпки в магазина.",
    };
  }

  const handoffSignature = buildCampaignHandoffSignature(evaluation);
  if (!signaturesMatch(opened.payload.signature, handoffSignature)) {
    return {
      ok: false,
      title: "Невалидна кампанийна връзка",
      message: "Handoff payload-ът е променен или е изтекъл. Моля, опитай отново.",
    };
  }

  return {
    ok: true,
    result: evaluation,
    handoffSignature,
  };
}
