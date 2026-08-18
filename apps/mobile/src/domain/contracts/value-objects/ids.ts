/**
 * EPIC 92 — Branded ID value objects.
 */

export type ProductId = string & { readonly __brand: "ProductId" };
export type OrderId = string & { readonly __brand: "OrderId" };
export type SellerId = string & { readonly __brand: "SellerId" };
export type CategoryId = string & { readonly __brand: "CategoryId" };
export type UserId = string & { readonly __brand: "UserId" };

export function productId(raw: string): ProductId {
  return raw as ProductId;
}

export function orderId(raw: string): OrderId {
  return raw as OrderId;
}

export function sellerId(raw: string): SellerId {
  return raw as SellerId;
}

export function categoryId(raw: string): CategoryId {
  return raw as CategoryId;
}

export function userId(raw: string): UserId {
  return raw as UserId;
}
