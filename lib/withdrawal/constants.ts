export const WITHDRAWAL_STATUSES = [
  "new",
  "reviewing",
  "accepted",
  "rejected",
  "completed",
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUSES)[number];

export const withdrawalStatusLabels: Record<WithdrawalStatus, string> = {
  new: "Нова",
  reviewing: "В преглед",
  accepted: "Приета",
  rejected: "Отхвърлена",
  completed: "Приключена",
};

export const WITHDRAWAL_RATE_LIMIT = {
  scope: "contract-withdrawal",
  limit: 5,
  windowSeconds: 900,
} as const;

export const WITHDRAWAL_FIELD_LIMITS = {
  orderNumber: 32,
  customerName: 120,
  email: 160,
  phone: 30,
  itemsDescription: 2000,
  note: 1000,
  honeypot: 200,
} as const;

export const WITHDRAWAL_PAGE_ROBOTS = {
  index: false,
  follow: true,
} as const;

export const WITHDRAWAL_SUCCESS_MESSAGE =
  "Ако данните са коректни, заявлението за отказ е прието. При нужда ще се свържем с вас по предоставения контакт.";

export const WITHDRAWAL_LEGAL_NOTICE =
  "При някои поръчки — например стоки, изработени по конкретни указания на клиента или ясно персонализирани — правото на отказ по ЗЗП може да не се прилага. Оценката се прави индивидуално за конкретната поръчка. Това не засяга рекламационните права при несъответствие или дефект.";

export const WITHDRAWAL_LEGAL_REVIEW_NOTICE =
  "Окончателният текст на тази страница подлежи на потвърждение от юрист и/или КЗП.";
