"use server";

import {
  subscribeToSelectedTopics,
  type SubscriptionActionState,
} from "@/lib/subscriptions/subscribe";

export type NewsletterState = SubscriptionActionState;

export async function subscribeToNewsletter(
  _previousState: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  return subscribeToSelectedTopics(formData);
}
