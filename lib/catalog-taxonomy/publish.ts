/**
 * ACTIVE publish requirements — ProductType + required characteristics.
 */

import { ProductStatus } from "@prisma/client";

export type PublishBlockReason =
  | "PRODUCT_TYPE_REQUIRED"
  | "CHARACTERISTICS_REQUIRED";

export type ActivePublishCheck =
  | { ok: true }
  | { ok: false; code: PublishBlockReason; message: string };

/** ACTIVE listings require ProductType (category may be derived from type). */
export function assertActivePublishRequirements(input: {
  status: ProductStatus;
  productTypeId?: string | null;
}): ActivePublishCheck {
  if (input.status !== ProductStatus.ACTIVE) {
    return { ok: true };
  }
  if (!input.productTypeId?.trim()) {
    return {
      ok: false,
      code: "PRODUCT_TYPE_REQUIRED",
      message: "Выберите тип товара для публикации (ProductType обязателен)",
    };
  }
  return { ok: true };
}
