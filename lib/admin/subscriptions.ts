import type {
  NewsletterSubscriberRow,
  SubscriptionTopic,
} from "@/lib/admin/types";

export const SUBSCRIPTION_TOPICS: {
  value: SubscriptionTopic;
  label: string;
  shortLabel: string;
}[] = [
  { value: "products", label: "Нови продукти", shortLabel: "Продукти" },
  { value: "blog", label: "Нови статии в блога", shortLabel: "Блог" },
  { value: "events", label: "Предстоящи работилници", shortLabel: "Работилници" },
];

export type SubscriberStatusFilter = "all" | "active" | "inactive";
export type SubscriberTopicFilter = "all" | SubscriptionTopic;

export function normalizeSubscriberStatus(value: string): SubscriberStatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

export function normalizeSubscriberTopic(value: string): SubscriberTopicFilter {
  return SUBSCRIPTION_TOPICS.some((topic) => topic.value === value)
    ? (value as SubscriptionTopic)
    : "all";
}

export function filterSubscribers(
  subscribers: NewsletterSubscriberRow[],
  {
    search,
    topic,
    status,
  }: {
    search: string;
    topic: SubscriberTopicFilter;
    status: SubscriberStatusFilter;
  },
) {
  const normalizedSearch = search.trim().toLowerCase();

  return subscribers.filter((subscriber) => {
    if (normalizedSearch && !subscriber.email.toLowerCase().includes(normalizedSearch)) {
      return false;
    }
    if (topic !== "all" && !subscriber.topics.includes(topic)) {
      return false;
    }
    if (status === "active" && !subscriber.is_active) {
      return false;
    }
    if (status === "inactive" && subscriber.is_active) {
      return false;
    }
    return true;
  });
}

export function getSubscriberCounts(subscribers: NewsletterSubscriberRow[]) {
  return {
    total: subscribers.length,
    active: subscribers.filter((subscriber) => subscriber.is_active).length,
    products: subscribers.filter(
      (subscriber) => subscriber.is_active && subscriber.topics.includes("products"),
    ).length,
    blog: subscribers.filter(
      (subscriber) => subscriber.is_active && subscriber.topics.includes("blog"),
    ).length,
    events: subscribers.filter(
      (subscriber) => subscriber.is_active && subscriber.topics.includes("events"),
    ).length,
  };
}

function escapeCsvCell(value: string) {
  const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function buildSubscriberCsv(subscribers: NewsletterSubscriberRow[]) {
  const header = [
    "email",
    "products",
    "blog",
    "events",
    "created_at",
  ];
  const rows = subscribers.map((subscriber) => [
    subscriber.email,
    subscriber.topics.includes("products") ? "yes" : "no",
    subscriber.topics.includes("blog") ? "yes" : "no",
    subscriber.topics.includes("events") ? "yes" : "no",
    subscriber.created_at,
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvCell(value)).join(","))
    .join("\r\n");
}
