"use server";

import {
  subscribeToSelectedTopics,
  type SubscriptionActionState,
} from "@/lib/subscriptions/subscribe";

export type EventNotificationState = SubscriptionActionState;

export async function subscribeToEventNotifications(
  _previousState: EventNotificationState,
  formData: FormData,
): Promise<EventNotificationState> {
  return subscribeToSelectedTopics(formData);
}
