export type ProductPageContentInput = {
  description?: string | null;
  personalizationInfo?: string | null;
  dimensionsMaterials?: string | null;
  orderingInfo?: string | null;
  additionalInfo?: string | null;
};

export type ProductPageContentSection = {
  id: string;
  heading: string;
  content: string;
};

const sectionDefinitions = [
  {
    id: "about",
    heading: "За продукта",
    getValue: (input: ProductPageContentInput) => input.description,
  },
  {
    id: "personalization",
    heading: "Персонализация",
    getValue: (input: ProductPageContentInput) => input.personalizationInfo,
  },
  {
    id: "dimensions-materials",
    heading: "Размери и материали",
    getValue: (input: ProductPageContentInput) => input.dimensionsMaterials,
  },
  {
    id: "ordering",
    heading: "Как да поръчате",
    getValue: (input: ProductPageContentInput) => input.orderingInfo,
  },
  {
    id: "additional-info",
    heading: "Допълнителна информация",
    getValue: (input: ProductPageContentInput) => input.additionalInfo,
  },
] as const;

export function getProductPageContentSections(
  input: ProductPageContentInput,
): ProductPageContentSection[] {
  return sectionDefinitions.flatMap((section) => {
    const content = section.getValue(input)?.trim() ?? "";
    if (!content) {
      return [];
    }

    return [{
      id: section.id,
      heading: section.heading,
      content,
    }];
  });
}

export function hasProductPageContent(input: ProductPageContentInput): boolean {
  return getProductPageContentSections(input).length > 0;
}
