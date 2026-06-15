import {
  WITHDRAWAL_FIELD_LIMITS,
  WITHDRAWAL_STATUSES,
  type WithdrawalStatus,
} from "@/lib/withdrawal/constants";

export type WithdrawalFormInput = {
  orderNumber: string;
  customerName: string;
  contactEmail: string;
  contactPhone: string;
  receivedAt: string;
  itemsDescription: string;
  note: string;
  statementConfirmed: boolean;
  confirmationChecked: boolean;
  idempotencyKey: string;
  honeypot: string;
};

export type WithdrawalFieldErrors = Partial<
  Record<
    | "order_number"
    | "customer_name"
    | "contact_email"
    | "contact_phone"
    | "received_at"
    | "items_description"
    | "note"
    | "statement_confirmed"
    | "confirmation_checked",
    string
  >
>;

export type WithdrawalValidationResult =
  | {
      ok: true;
      value: {
        orderNumber: string;
        customerName: string;
        contactEmail: string | null;
        contactPhone: string | null;
        receivedAt: string;
        itemsDescription: string;
        note: string | null;
        idempotencyKey: string;
      };
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: WithdrawalFieldErrors;
    };

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimField(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    return { ok: false as const, value: trimmed.slice(0, maxLength) };
  }
  return { ok: true as const, value: trimmed };
}

export function normalizeWithdrawalPhone(value: string) {
  return value.replace(/\D/g, "");
}

export function isWithdrawalStatus(value: string): value is WithdrawalStatus {
  return (WITHDRAWAL_STATUSES as readonly string[]).includes(value);
}

export function validateWithdrawalForm(
  input: WithdrawalFormInput,
): WithdrawalValidationResult {
  if (input.honeypot.trim()) {
    return { ok: false, message: "Заявлението не беше прието." };
  }

  const orderNumberResult = trimField(
    input.orderNumber,
    WITHDRAWAL_FIELD_LIMITS.orderNumber,
  );
  const customerNameResult = trimField(
    input.customerName,
    WITHDRAWAL_FIELD_LIMITS.customerName,
  );
  const contactEmailResult = trimField(
    input.contactEmail,
    WITHDRAWAL_FIELD_LIMITS.email,
  );
  const contactPhoneResult = trimField(
    input.contactPhone,
    WITHDRAWAL_FIELD_LIMITS.phone,
  );
  const itemsDescriptionResult = trimField(
    input.itemsDescription,
    WITHDRAWAL_FIELD_LIMITS.itemsDescription,
  );
  const noteResult = trimField(input.note, WITHDRAWAL_FIELD_LIMITS.note);
  const receivedAt = input.receivedAt.trim();
  const idempotencyKey = input.idempotencyKey.trim();

  const fieldErrors: WithdrawalFieldErrors = {};

  if (!orderNumberResult.ok) {
    fieldErrors.order_number = "Номерът на поръчката е твърде дълъг.";
  }
  if (!customerNameResult.ok) {
    fieldErrors.customer_name = "Името е твърде дълго.";
  }
  if (!contactEmailResult.ok) {
    fieldErrors.contact_email = "Имейл адресът е твърде дълъг.";
  }
  if (!contactPhoneResult.ok) {
    fieldErrors.contact_phone = "Телефонът е твърде дълъг.";
  }
  if (!itemsDescriptionResult.ok) {
    fieldErrors.items_description = "Описанието на артикулите е твърде дълго.";
  }
  if (!noteResult.ok) {
    fieldErrors.note = "Бележката е твърде дълга.";
  }

  const orderNumber = orderNumberResult.value;
  const customerName = customerNameResult.value;
  const contactEmail = contactEmailResult.value;
  const contactPhone = contactPhoneResult.value;
  const itemsDescription = itemsDescriptionResult.value;
  const note = noteResult.value;

  if (!UUID_V4_PATTERN.test(idempotencyKey)) {
    return {
      ok: false,
      message: "Заявката е невалидна. Презаредете страницата и опитайте отново.",
    };
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Моля, коригирайте маркираните полета.",
      fieldErrors,
    };
  }

  if (orderNumber.length < 4) {
    fieldErrors.order_number = "Въведете номер на поръчката.";
  }

  if (customerName.length < 2) {
    fieldErrors.customer_name = "Въведете име.";
  }

  if (!contactEmail && !contactPhone) {
    fieldErrors.contact_email = "Въведете имейл или телефон от поръчката.";
    fieldErrors.contact_phone = "Въведете имейл или телефон от поръчката.";
  }

  if (contactEmail && !EMAIL_PATTERN.test(contactEmail)) {
    fieldErrors.contact_email = "Имейл адресът не е валиден.";
  }

  if (contactPhone && normalizeWithdrawalPhone(contactPhone).length < 6) {
    fieldErrors.contact_phone = "Въведете валиден телефон.";
  }

  if (!receivedAt || Number.isNaN(Date.parse(receivedAt))) {
    fieldErrors.received_at = "Въведете валидна дата на получаване.";
  } else {
    const receivedDate = new Date(`${receivedAt}T12:00:00`);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (receivedDate > today) {
      fieldErrors.received_at = "Датата на получаване не може да е в бъдещето.";
    }
  }

  if (itemsDescription.length < 3) {
    fieldErrors.items_description =
      "Опишете артикулите или изберете/въведете продуктите за отказ.";
  }

  if (!input.statementConfirmed) {
    fieldErrors.statement_confirmed =
      "Необходимо е ясно заявление за отказ от договор.";
  }

  if (!input.confirmationChecked) {
    fieldErrors.confirmation_checked =
      "Потвърдете, че данните са верни и желаете отказ от договор.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Моля, коригирайте маркираните полета.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      orderNumber,
      customerName,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      receivedAt,
      itemsDescription,
      note: note || null,
      idempotencyKey,
    },
  };
}
