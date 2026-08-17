import { loadAppConfig } from "../../config/env";
import { discountPercent } from "../../utils/format";
import { resolveImageUrl } from "../../utils/format";
import type { MobileProductListItem } from "../../api/endpoints";

export type CartLineView = {
  productId: string;
  quantity: number;
  lineTotal: number;
  title: string;
  price: number;
  compareAt: number | null;
  imageUrl: string | null;
  sellerName: string | null;
  sellerId: string | null;
  stock: number;
  categoryId: string | null;
  qtyBusy: boolean;
  removing: boolean;
};

export type CartCommerceView = {
  items: CartLineView[];
  itemCount: number;
  subtotal: number;
  savings: number;
  currency: string;
};

export type CheckoutContactFields = {
  phone: string;
  email: string;
};

export type CheckoutRecipientFields = {
  fullName: string;
};

export type CheckoutDeliveryFields = {
  city: string;
  method: "PICKUP" | "COURIER";
  pickupPointCode: string;
};

export type CheckoutPaymentMethod = "card" | "wallet";

export type CheckoutFormState = {
  contact: CheckoutContactFields;
  recipient: CheckoutRecipientFields;
  delivery: CheckoutDeliveryFields;
  paymentMethod: CheckoutPaymentMethod;
  comment: string;
};

export type CheckoutFieldErrors = {
  phone?: string;
  email?: string;
  fullName?: string;
  city?: string;
  pickupPointCode?: string;
  payment?: string;
};

export type DeliveryQuoteView = {
  cost: number;
  currency: string;
  etaLabel: string;
  source: string;
};

export type PickupPointView = {
  code: string;
  name: string;
  address: string;
  city: string;
  workTime?: string;
};

export type CheckoutSummary = {
  goodsTotal: number;
  deliveryCost: number;
  discountTotal: number;
  orderTotal: number;
  currency: string;
};

function readNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function parseCartCommerceView(raw: Record<string, unknown>): CartCommerceView {
  const config = loadAppConfig();
  const currency = readString(raw.currency) ?? "RUB";
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];

  const items: CartLineView[] = itemsRaw.map((entry) => {
    const line = entry as Record<string, unknown>;
    const product = (line.product as Record<string, unknown> | undefined) ?? {};
    const productId = String(line.productId ?? product.id ?? "");
    const quantity = Math.max(1, readNumber(line.quantity, 1));
    const price = readNumber(product.price);
    const lineTotal = readNumber(line.lineTotal, price * quantity);
    const imageRaw = product.primaryImage as { url?: string } | null | undefined;
    const imageUrl = resolveImageUrl(imageRaw?.url ?? null, config.apiBaseUrl);

    return {
      productId,
      quantity,
      lineTotal,
      title: String(product.title ?? product.name ?? "Товар"),
      price,
      compareAt: null,
      imageUrl,
      sellerName: null,
      sellerId: null,
      stock: readNumber(product.stock, 0),
      categoryId: null,
      qtyBusy: false,
      removing: false,
    };
  });

  const itemCount = readNumber(raw.itemCount, items.reduce((sum, item) => sum + item.quantity, 0));
  const subtotal = readNumber(raw.subtotal, items.reduce((sum, item) => sum + item.lineTotal, 0));
  const savings = items.reduce((sum, item) => {
    if (item.compareAt && item.compareAt > item.price) {
      return sum + (item.compareAt - item.price) * item.quantity;
    }
    return sum;
  }, 0);

  return { items, itemCount, subtotal, savings, currency };
}

export function mergeProductEnrichment(
  line: CartLineView,
  productRaw: Record<string, unknown>,
): CartLineView {
  const compareAtRaw = productRaw.compareAt != null ? readNumber(productRaw.compareAt, NaN) : null;
  const compareAt = compareAtRaw != null && Number.isFinite(compareAtRaw) ? compareAtRaw : null;
  const seller = productRaw.seller as { id?: string; storeName?: string } | null | undefined;
  const category = productRaw.category as { id?: string } | null | undefined;

  return {
    ...line,
    compareAt,
    sellerName: readString(seller?.storeName),
    sellerId: readString(seller?.id),
    categoryId: readString(category?.id),
    stock: readNumber(productRaw.stock, line.stock),
  };
}

export function recomputeCartTotals(items: CartLineView[]): Pick<CartCommerceView, "itemCount" | "subtotal" | "savings"> {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const savings = items.reduce((sum, item) => {
    if (item.compareAt && item.compareAt > item.price) {
      return sum + (item.compareAt - item.price) * item.quantity;
    }
    return sum;
  }, 0);
  return { itemCount, subtotal, savings };
}

export function lineDiscountPercent(line: CartLineView): number | null {
  return discountPercent(line.price, line.compareAt);
}

export function toRecommendationProduct(line: CartLineView): MobileProductListItem | null {
  if (!line.productId) return null;
  return {
    id: line.productId,
    title: line.title,
    price: line.price,
    compareAt: line.compareAt,
    stock: line.stock,
    primaryImage: line.imageUrl ? { url: line.imageUrl } : null,
    seller: line.sellerId ? { id: line.sellerId, storeName: line.sellerName ?? undefined } : undefined,
  };
}

export const EMPTY_CHECKOUT_FORM: CheckoutFormState = {
  contact: { phone: "", email: "" },
  recipient: { fullName: "" },
  delivery: { city: "Москва", method: "PICKUP", pickupPointCode: "" },
  paymentMethod: "card",
  comment: "",
};
