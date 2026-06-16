"use client";

import { addProductGalleryImages } from "@/app/admin/actions";
import { AdminFormPendingGuard } from "@/components/admin/admin-form-pending-guard";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { ProductImageFileInput } from "@/components/admin/product-image-file-input";
import { adminFieldClass, adminHelperClass } from "@/components/admin/styles";
import { adminFormFields } from "@/lib/admin/form-fields";

type ProductGalleryAddFormProps = {
  productId: string;
  productName: string;
  existingGalleryCount: number;
};

export function ProductGalleryAddForm({
  productId,
  productName,
  existingGalleryCount,
}: ProductGalleryAddFormProps) {
  return (
    <form action={addProductGalleryImages} className="mt-4 space-y-3 rounded-xl border border-boutique-line/70 bg-white p-4">
      <input type="hidden" name={adminFormFields.common.tab} value="products" />
      <input type="hidden" name={adminFormFields.common.id} value={productId} />
      <input type="hidden" name={adminFormFields.product.name} value={productName} />
      <ProductImageFileInput
        name={adminFormFields.product.imageFiles}
        altTextName={adminFormFields.product.imageAltTexts}
        label="Добави снимки"
        className={adminFieldClass}
        helperClassName={adminHelperClass}
        existingGalleryCount={existingGalleryCount}
        helperText="Новите снимки се добавят към галерията без да заменят съществуващите."
      />
      <div className="flex flex-wrap items-center gap-3">
        <AdminSubmitButton
          pendingLabel="Обработване и качване…"
          className="rounded-full bg-boutique-ink px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-boutique-paper transition hover:bg-boutique-accent disabled:cursor-not-allowed disabled:opacity-70"
        >
          Добави снимки
        </AdminSubmitButton>
      </div>
      <AdminFormPendingGuard message="Обработване и качване на снимки… Моля, не затваряйте страницата." />
    </form>
  );
}
