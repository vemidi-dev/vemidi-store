"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getFaqGroupItemIds,
  isFaqSlugConflictError,
  parseFaqGroupForm,
  parseFaqItemForm,
} from "@/lib/admin/faq-form";
import { getString } from "@/lib/admin/form-data";
import { replaceFaqGroupItems } from "@/lib/faq/association-rpc";
import { adminFormFields } from "@/lib/admin/form-fields";
import { checkIsAdmin } from "@/lib/supabase/admin-auth";
import { createClient } from "@/lib/supabase/server";

function done(kind: "success" | "error", message: string): never {
  revalidatePath("/admin");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/produkti/[slug]", "page");
  redirect(`/admin?tab=faq&${kind}=${encodeURIComponent(message)}`);
}

async function getAuthorizedClient() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/admin/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/admin/login");
  }

  const { isAdmin } = await checkIsAdmin(supabase, user.id);
  if (!isAdmin) {
    redirect("/admin/login");
  }

  return supabase;
}

function getId(formData: FormData, key: string) {
  return getString(formData, key);
}

async function nextGroupSortOrder(
  supabase: Awaited<ReturnType<typeof getAuthorizedClient>>,
  scope: "global" | "product",
) {
  const { data } = await supabase
    .from("faq_groups")
    .select("sort_order")
    .eq("scope", scope)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (Number(data?.sort_order) || 0) + 10;
}

async function nextItemSortOrder(supabase: Awaited<ReturnType<typeof getAuthorizedClient>>) {
  const { data } = await supabase
    .from("faq_items")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (Number(data?.sort_order) || 0) + 10;
}

export async function createFaqGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const parsed = parseFaqGroupForm(formData);
  if (parsed.error || !parsed.slug || !parsed.scope) {
    done("error", parsed.error ?? "Невалидни данни за групата.");
  }

  const sortOrder =
    parsed.sortOrder > 0
      ? parsed.sortOrder
      : await nextGroupSortOrder(supabase, parsed.scope);

  const { error } = await supabase.from("faq_groups").insert({
    name: parsed.name,
    slug: parsed.slug,
    scope: parsed.scope,
    sort_order: sortOrder,
    is_active: parsed.isActive,
  });

  if (error) {
    done(
      "error",
      isFaqSlugConflictError(error.message)
        ? "Slug-ът вече се използва от друга FAQ група."
        : "Групата не беше създадена.",
    );
  }

  done("success", "FAQ групата е добавена.");
}

export async function updateFaqGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getId(formData, adminFormFields.common.id);
  const parsed = parseFaqGroupForm(formData);
  if (!id || parsed.error || !parsed.slug || !parsed.scope) {
    done("error", parsed.error ?? "Невалидни данни за групата.");
  }

  const { error } = await supabase
    .from("faq_groups")
    .update({
      name: parsed.name,
      slug: parsed.slug,
      scope: parsed.scope,
      sort_order: parsed.sortOrder,
      is_active: parsed.isActive,
    })
    .eq("id", id);

  if (error) {
    done(
      "error",
      isFaqSlugConflictError(error.message)
        ? "Slug-ът вече се използва от друга FAQ група."
        : "Групата не беше обновена.",
    );
  }

  done("success", "FAQ групата е обновена.");
}

export async function createFaqItem(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const parsed = parseFaqItemForm(formData);
  if (parsed.error) {
    done("error", parsed.error);
  }

  const sortOrder =
    parsed.sortOrder > 0 ? parsed.sortOrder : await nextItemSortOrder(supabase);

  const { data, error } = await supabase
    .from("faq_items")
    .insert({
      question: parsed.question,
      answer: parsed.answer,
      sort_order: sortOrder,
      is_active: parsed.isActive,
    })
    .select("id")
    .single();

  if (error || !data) {
    done("error", "Въпросът не беше добавен.");
  }

  const groupId = getId(formData, adminFormFields.faq.groupId);
  if (groupId) {
    const { error: linkError } = await supabase.from("faq_group_items").insert({
      group_id: groupId,
      faq_item_id: data.id,
      sort_order: sortOrder,
    });
    if (linkError) {
      await supabase.from("faq_items").delete().eq("id", data.id);
      done("error", "Въпросът беше създаден, но не беше добавен към групата.");
    }
  }

  done("success", "FAQ въпросът е добавен.");
}

export async function updateFaqItem(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getId(formData, adminFormFields.common.id);
  const parsed = parseFaqItemForm(formData);
  if (!id || parsed.error) {
    done("error", parsed.error ?? "Невалидни данни за въпроса.");
  }

  const { error } = await supabase
    .from("faq_items")
    .update({
      question: parsed.question,
      answer: parsed.answer,
      sort_order: parsed.sortOrder,
      is_active: parsed.isActive,
    })
    .eq("id", id);

  done(
    error ? "error" : "success",
    error ? "Въпросът не беше обновен." : "FAQ въпросът е обновен.",
  );
}

export async function deleteFaqItem(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getId(formData, adminFormFields.common.id);
  if (!id) {
    done("error", "Липсва въпрос за изтриване.");
  }

  const [{ count: groupCount }, { count: productCount }] = await Promise.all([
    supabase
      .from("faq_group_items")
      .select("group_id", { count: "exact", head: true })
      .eq("faq_item_id", id),
    supabase
      .from("product_faq_items")
      .select("product_id", { count: "exact", head: true })
      .eq("faq_item_id", id),
  ]);

  const usage = (groupCount ?? 0) + (productCount ?? 0);
  if (usage > 0) {
    done(
      "error",
      `Въпросът се използва в ${groupCount ?? 0} групи и ${productCount ?? 0} продукта. Премахнете асоциациите преди изтриване.`,
    );
  }

  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  done(
    error ? "error" : "success",
    error ? "Въпросът не беше изтрит." : "FAQ въпросът е изтрит.",
  );
}

export async function syncFaqGroupItems(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const groupId = getId(formData, adminFormFields.faq.groupId);
  const itemIds = getFaqGroupItemIds(formData);

  if (!groupId) {
    done("error", "Липсва група за обновяване.");
  }

  const rpcError = await replaceFaqGroupItems(supabase, groupId, itemIds);
  if (rpcError) {
    done("error", rpcError);
  }

  done("success", "Въпросите в групата са обновени.");
}

export async function addFaqItemToGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const groupId = getId(formData, adminFormFields.faq.groupId);
  const itemId = getId(formData, adminFormFields.faq.itemId);
  if (!groupId || !itemId) {
    done("error", "Изберете група и въпрос.");
  }

  const { data: existing } = await supabase
    .from("faq_group_items")
    .select("group_id")
    .eq("group_id", groupId)
    .eq("faq_item_id", itemId)
    .maybeSingle();
  if (existing) {
    done("error", "Въпросът вече е в групата.");
  }

  const { data: lastLink } = await supabase
    .from("faq_group_items")
    .select("sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("faq_group_items").insert({
    group_id: groupId,
    faq_item_id: itemId,
    sort_order: (Number(lastLink?.sort_order) || 0) + 10,
  });

  done(
    error ? "error" : "success",
    error ? "Въпросът не беше добавен към групата." : "Въпросът е добавен към групата.",
  );
}

export async function removeFaqItemFromGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const groupId = getId(formData, adminFormFields.faq.groupId);
  const itemId = getId(formData, adminFormFields.faq.itemId);
  if (!groupId || !itemId) {
    done("error", "Липсва група или въпрос.");
  }

  const { error } = await supabase
    .from("faq_group_items")
    .delete()
    .eq("group_id", groupId)
    .eq("faq_item_id", itemId);

  done(
    error ? "error" : "success",
    error ? "Въпросът не беше премахнат от групата." : "Въпросът е премахнат от групата.",
  );
}

export async function moveFaqGroup(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const id = getId(formData, adminFormFields.common.id);
  const direction = getString(formData, adminFormFields.faq.direction);
  if (!id || !["up", "down"].includes(direction)) {
    done("error", "Невалидна заявка за преместване на група.");
  }

  const { data: current } = await supabase
    .from("faq_groups")
    .select("id, scope, sort_order")
    .eq("id", id)
    .maybeSingle();
  if (!current) {
    done("error", "Групата не беше намерена.");
  }

  const baseQuery = supabase
    .from("faq_groups")
    .select("id, sort_order")
    .eq("scope", current.scope)
    .neq("id", id)
    .limit(1);

  const { data: neighbors } =
    direction === "up"
      ? await baseQuery
          .lt("sort_order", current.sort_order)
          .order("sort_order", { ascending: false })
      : await baseQuery
          .gt("sort_order", current.sort_order)
          .order("sort_order", { ascending: true });
  const neighbor = neighbors?.[0];
  if (!neighbor) {
    done("success", "Групата вече е в края на списъка.");
  }

  const currentOrder = current.sort_order;
  const neighborOrder = neighbor.sort_order;

  const [{ error: firstError }, { error: secondError }] = await Promise.all([
    supabase.from("faq_groups").update({ sort_order: neighborOrder }).eq("id", current.id),
    supabase.from("faq_groups").update({ sort_order: currentOrder }).eq("id", neighbor.id),
  ]);

  if (firstError || secondError) {
    done("error", "Групата не беше преместена.");
  }

  done("success", "Редът на групите е променен.");
}

export async function moveFaqGroupItem(formData: FormData) {
  const supabase = await getAuthorizedClient();
  const groupId = getId(formData, adminFormFields.faq.groupId);
  const itemId = getId(formData, adminFormFields.faq.itemId);
  const direction = getString(formData, adminFormFields.faq.direction);
  if (!groupId || !itemId || !["up", "down"].includes(direction)) {
    done("error", "Невалидна заявка за преместване на въпрос.");
  }

  const { data: links } = await supabase
    .from("faq_group_items")
    .select("group_id, faq_item_id, sort_order")
    .eq("group_id", groupId)
    .order("sort_order", { ascending: true })
    .order("faq_item_id", { ascending: true });

  const ordered = links ?? [];
  const index = ordered.findIndex((row) => row.faq_item_id === itemId);
  if (index < 0) {
    done("error", "Въпросът не е в групата.");
  }

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) {
    done("success", "Въпросът вече е в края на списъка.");
  }

  const current = ordered[index];
  const neighbor = ordered[swapIndex];
  const currentOrder = current.sort_order;
  const neighborOrder = neighbor.sort_order;

  const [{ error: firstError }, { error: secondError }] = await Promise.all([
    supabase
      .from("faq_group_items")
      .update({ sort_order: neighborOrder })
      .eq("group_id", groupId)
      .eq("faq_item_id", current.faq_item_id),
    supabase
      .from("faq_group_items")
      .update({ sort_order: currentOrder })
      .eq("group_id", groupId)
      .eq("faq_item_id", neighbor.faq_item_id),
  ]);

  if (firstError || secondError) {
    done("error", "Въпросът не беше преместен.");
  }

  done("success", "Редът на въпросите в групата е променен.");
}
