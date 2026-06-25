import { adminFormFields } from "@/lib/admin/form-fields";
import type { ProductPageContentFormDefaults } from "@/lib/admin/product-page-content";

type ProductPageContentFieldsProps = {
  defaults?: Partial<{
    subtitle: string;
    description: string;
    additionalInfo: string;
  }> & ProductPageContentFormDefaults;
  fieldClassName: string;
  helperClassName: string;
};

export function ProductPageContentFields({
  defaults,
  fieldClassName,
  helperClassName,
}: ProductPageContentFieldsProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Кратко резюме (подзаглавие)
        <input
          name={adminFormFields.product.subtitle}
          defaultValue={defaults?.subtitle ?? ""}
          className={fieldClassName}
          placeholder="Кратко пояснение под заглавието"
        />
        <p className={helperClassName}>
          Показва се в горната част на продуктовата страница, под заглавието.
        </p>
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        За продукта
        <textarea
          name={adminFormFields.product.description}
          rows={4}
          defaultValue={defaults?.description ?? ""}
          className={`${fieldClassName} resize-y`}
          placeholder="Основно описание на продукта"
        />
        <p className={helperClassName}>
          Секция „За продукта“ в долната информационна зона. Натискайте Enter за нов ред.
        </p>
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Персонализация
        <textarea
          name={adminFormFields.product.personalizationInfo}
          rows={3}
          defaultValue={defaults?.personalization_info ?? ""}
          className={`${fieldClassName} resize-y`}
          placeholder="Какво може да се персонализира и какви детайли са нужни"
        />
        <p className={helperClassName}>
          Секция „Персонализация“ в долната информационна зона. Натискайте Enter за нов ред.
        </p>
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Размери и материали
        <textarea
          name={adminFormFields.product.dimensionsMaterials}
          rows={3}
          defaultValue={defaults?.dimensions_materials ?? ""}
          className={`${fieldClassName} resize-y`}
          placeholder="Размери, материали, тегло или други технически детайли"
        />
        <p className={helperClassName}>
          Секция „Размери и материали“ в долната информационна зона. Натискайте Enter за нов ред.
        </p>
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Как да поръчате
        <textarea
          name={adminFormFields.product.orderingInfo}
          rows={3}
          defaultValue={defaults?.ordering_info ?? ""}
          className={`${fieldClassName} resize-y`}
          placeholder="Стъпки или указания за поръчка на този продукт"
        />
        <p className={helperClassName}>
          Секция „Как да поръчате“ в долната информационна зона. Натискайте Enter за нов ред.
        </p>
      </label>

      <label className="text-sm font-medium text-boutique-ink md:col-span-2">
        Допълнителна информация
        <textarea
          name={adminFormFields.product.additionalInfo}
          rows={3}
          defaultValue={defaults?.additionalInfo ?? ""}
          className={`${fieldClassName} resize-y`}
          placeholder="Други полезни детайли за клиента"
        />
        <p className={helperClassName}>
          Секция „Допълнителна информация“ в долната информационна зона. Натискайте Enter за нов ред.
        </p>
      </label>
    </div>
  );
}
