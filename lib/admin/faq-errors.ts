import type { PostgrestError } from "@supabase/supabase-js";

import { isFaqSlugConflictError } from "@/lib/admin/faq-form";

export function getFaqGroupMutationErrorMessage(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
  action: "create" | "update",
): string {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  const fallback =
    action === "create" ? "Групата не беше създадена." : "Групата не беше обновена.";

  if (!message) {
    return fallback;
  }

  if (isFaqSlugConflictError(message)) {
    return "Slug-ът вече се използва от друга FAQ група.";
  }

  if (message.includes("faq_groups_name_check")) {
    return "Името на групата не може да е празно.";
  }

  if (message.includes("faq_groups_slug_check")) {
    return "Slug-ът на групата не може да е празен.";
  }

  if (message.includes("faq_groups_scope_check")) {
    return "Невалиден обхват на групата. Използвайте global или product.";
  }

  if (
    error?.code === "42501" ||
    message.includes("admin_required") ||
    message.toLowerCase().includes("permission denied") ||
    message.toLowerCase().includes("row-level security")
  ) {
    return "Нямате права за запис на FAQ група. Проверете admin достъпа.";
  }

  return `${fallback} (${message})`;
}

export function getFaqItemMutationErrorMessage(
  error: Pick<PostgrestError, "code" | "message" | "details" | "hint"> | null | undefined,
): string {
  const message = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");

  if (!message) {
    return "Въпросът не беше добавен.";
  }

  if (message.includes("faq_items_question_check")) {
    return "Въпросът не може да е празен.";
  }

  if (message.includes("faq_items_answer_check")) {
    return "Отговорът не може да е празен.";
  }

  if (message.includes("faq_items_question_normalized_unique")) {
    return "Въпрос с този текст вече съществува в библиотеката.";
  }

  if (
    error?.code === "42501" ||
    message.toLowerCase().includes("permission denied") ||
    message.toLowerCase().includes("row-level security")
  ) {
    return "Нямате права за запис на FAQ въпрос. Проверете admin достъпа.";
  }

  return `Въпросът не беше добавен. (${message})`;
}

export function isFaqGroupItemDuplicateError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  return (
    message.includes("faq_group_items_pkey") ||
    message.includes("duplicate key value") ||
    message.includes("already exists")
  );
}
