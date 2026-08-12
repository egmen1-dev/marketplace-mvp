import { ProductStatus } from "@prisma/client";

/** Machine-readable blockers for paid traffic / ad catalog export. */
export const AD_ELIGIBILITY_REASONS = {
  NOT_ACTIVE: "NOT_ACTIVE",
  NO_STOCK: "NO_STOCK",
  NO_PRODUCT_TYPE: "NO_PRODUCT_TYPE",
  NO_IMAGE: "NO_IMAGE",
  NO_PRICE: "NO_PRICE",
  NO_SELLER: "NO_SELLER",
  SELLER_BLOCKED: "SELLER_BLOCKED",
} as const;

export type AdEligibilityReason =
  (typeof AD_ELIGIBILITY_REASONS)[keyof typeof AD_ELIGIBILITY_REASONS];

export type ProductAdvertisingEligibilityInput = {
  status: ProductStatus;
  stock: number;
  price: number;
  productTypeId?: string | null;
  imageCount: number;
  sellerId?: string | null;
  sellerBlocked?: boolean;
};

export type ProductAdvertisingEligibility = {
  eligible: boolean;
  reasons: AdEligibilityReason[];
};

export function evaluateProductAdvertisingEligibility(
  input: ProductAdvertisingEligibilityInput,
): ProductAdvertisingEligibility {
  const reasons: AdEligibilityReason[] = [];

  if (input.status !== ProductStatus.ACTIVE) {
    reasons.push(AD_ELIGIBILITY_REASONS.NOT_ACTIVE);
  }
  if (input.stock <= 0) {
    reasons.push(AD_ELIGIBILITY_REASONS.NO_STOCK);
  }
  if (!input.productTypeId) {
    reasons.push(AD_ELIGIBILITY_REASONS.NO_PRODUCT_TYPE);
  }
  if (input.imageCount <= 0) {
    reasons.push(AD_ELIGIBILITY_REASONS.NO_IMAGE);
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    reasons.push(AD_ELIGIBILITY_REASONS.NO_PRICE);
  }
  if (!input.sellerId) {
    reasons.push(AD_ELIGIBILITY_REASONS.NO_SELLER);
  } else if (input.sellerBlocked) {
    reasons.push(AD_ELIGIBILITY_REASONS.SELLER_BLOCKED);
  }

  return { eligible: reasons.length === 0, reasons };
}

const REASON_LABELS: Record<AdEligibilityReason, string> = {
  NOT_ACTIVE: "Товар не активен",
  NO_STOCK: "Нет остатка",
  NO_PRODUCT_TYPE: "Не выбран тип товара",
  NO_IMAGE: "Нет фото",
  NO_PRICE: "Не указана цена",
  NO_SELLER: "Нет продавца",
  SELLER_BLOCKED: "Продавец заблокирован",
};

const REASON_FIX_HINTS: Record<AdEligibilityReason, string> = {
  NOT_ACTIVE: "Опубликуйте товар со статусом «Активный»",
  NO_STOCK: "Укажите остаток больше 0",
  NO_PRODUCT_TYPE: "Выберите категорию и тип товара",
  NO_IMAGE: "Добавить фото",
  NO_PRICE: "Укажите цену больше 0",
  NO_SELLER: "Привяжите продавца",
  SELLER_BLOCKED: "Обратитесь в поддержку — кабинет заблокирован",
};

export function adEligibilityReasonLabel(reason: AdEligibilityReason): string {
  return REASON_LABELS[reason];
}

export function adEligibilityFixHint(reason: AdEligibilityReason): string {
  return REASON_FIX_HINTS[reason];
}

/** Seller-facing checklist items (deduped, human-readable). */
export function adEligibilityFixChecklist(
  reasons: AdEligibilityReason[],
): string[] {
  const hints = reasons.map(adEligibilityFixHint);
  return [...new Set(hints)];
}
