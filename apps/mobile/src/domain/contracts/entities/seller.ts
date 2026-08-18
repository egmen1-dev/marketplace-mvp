import type { Money } from "../value-objects/money";
import type { OrderId, ProductId, SellerId } from "../value-objects/ids";
import type { ProductSummary } from "./catalog";

export type SellerHomeDashboard = {
  readonly money: { readonly available: Money; readonly pending: Money };
  readonly orders: { readonly needAction: number };
  readonly products: { readonly active: number; readonly needAttention: number };
  readonly promotion: { readonly active: number };
  readonly intelligence: {
    readonly topAction: string | null;
    readonly productId: ProductId | null;
    readonly confidence: number | null;
    readonly reason: string | null;
  };
};

export type SellerProduct = ProductSummary & {
  readonly status: string;
  readonly views: number;
};

export type SellerProductPage = {
  readonly items: ReadonlyArray<SellerProduct>;
  readonly nextCursor: string | null;
  readonly fromCache: boolean;
};

export type SellerOrderSummary = {
  readonly id: OrderId;
  readonly orderNumber: string;
  readonly status: string;
  readonly total: Money;
  readonly buyerLabel: string | null;
  readonly createdAt: string;
};

export type SellerOrderPage = {
  readonly items: ReadonlyArray<SellerOrderSummary>;
  readonly nextCursor: string | null;
  readonly fromCache: boolean;
};

export type SellerPublicProfile = {
  readonly id: SellerId;
  readonly storeName: string;
  readonly subtitle: string | null;
  readonly rating: number | null;
  readonly productCount: number;
};
