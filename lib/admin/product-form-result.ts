export type ProductFormResult = { error: string };

export class ProductFormValidationError extends Error {}

export async function runProductFormAction(action: () => Promise<void>): Promise<ProductFormResult> {
  try {
    await action();
    return { error: "" };
  } catch (error) {
    if (error instanceof ProductFormValidationError) return { error: error.message };
    throw error;
  }
}
