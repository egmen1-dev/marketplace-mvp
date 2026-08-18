import type {
  SellerHomeDashboard,
  SellerOrderPage,
  SellerOrderSummary,
  SellerProduct,
  SellerProductPage,
  SellerPublicProfile,
} from "../../domain/contracts/entities/seller";
import { orderId, productId, sellerId } from "../../domain/contracts/value-objects/ids";
import { money } from "../../domain/contracts/value-objects/money";
import { mapProductSummaryDto, type MobileProductListDto } from "./commerce-mapper";

export type SellerHomeDto = {
  money: { available: number; pending: number };
  orders: { needAction: number };
  products: { active: number; needAttention: number };
  promotion: { active: number };
  intelligence: {
    topAction: string | null;
    productId: string | null;
    confidence?: number;
    reason?: string;
  };
};

export type SellerOrderDto = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  sellerSubtotal: number;
  currency: string;
  createdAt: string;
  buyerName: string | null;
};

export type SellerPublicProfileDto = {
  id: string;
  storeName: string;
  slug: string | null;
  description: string | null;
  isVerified: boolean;
  productCount: number;
  available: boolean;
};

export function mapSellerHomeDto(dto: SellerHomeDto): SellerHomeDashboard {
  return {
    money: {
      available: money(dto.money.available, "RUB"),
      pending: money(dto.money.pending, "RUB"),
    },
    orders: { needAction: dto.orders.needAction },
    products: { active: dto.products.active, needAttention: dto.products.needAttention },
    promotion: { active: dto.promotion.active },
    intelligence: {
      topAction: dto.intelligence.topAction,
      productId: dto.intelligence.productId ? productId(dto.intelligence.productId) : null,
      confidence: dto.intelligence.confidence ?? null,
      reason: dto.intelligence.reason ?? null,
    },
  };
}

export function mapSellerProductDto(dto: MobileProductListDto): SellerProduct {
  return {
    ...mapProductSummaryDto(dto),
    status: dto.status ?? "ACTIVE",
    views: dto.views ?? 0,
  };
}

export function mapSellerProductPageDto(dto: {
  items: MobileProductListDto[];
  nextCursor: string | null;
}): SellerProductPage {
  return {
    items: dto.items.map(mapSellerProductDto),
    nextCursor: dto.nextCursor,
    fromCache: false,
  };
}

export function mapSellerOrderSummaryDto(dto: SellerOrderDto): SellerOrderSummary {
  return {
    id: orderId(dto.id),
    orderNumber: dto.orderNumber,
    status: dto.status,
    total: money(dto.sellerSubtotal || dto.total, dto.currency || "RUB"),
    buyerLabel: dto.buyerName,
    createdAt: dto.createdAt,
  };
}

export function mapSellerOrderPageDto(dto: { items: SellerOrderDto[]; nextCursor: string | null }): SellerOrderPage {
  return {
    items: dto.items.map(mapSellerOrderSummaryDto),
    nextCursor: dto.nextCursor,
    fromCache: false,
  };
}

export function mapSellerPublicProfileDto(dto: SellerPublicProfileDto): SellerPublicProfile {
  return {
    id: sellerId(dto.id),
    storeName: dto.storeName,
    subtitle: dto.description,
    slug: dto.slug,
    description: dto.description,
    isVerified: dto.isVerified,
    rating: null,
    productCount: dto.productCount,
  };
}

export function sellerHomeDashboardToSnapshot(dashboard: SellerHomeDashboard) {
  return {
    money: { available: dashboard.money.available.amount, pending: dashboard.money.pending.amount },
    orders: dashboard.orders,
    products: dashboard.products,
    promotion: dashboard.promotion,
    intelligence: {
      topAction: dashboard.intelligence.topAction,
      productId: dashboard.intelligence.productId,
      confidence: dashboard.intelligence.confidence ?? undefined,
      reason: dashboard.intelligence.reason ?? undefined,
    },
  };
}

export function sellerOrderSummaryToSaleCard(order: SellerOrderSummary) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    sellerSubtotal: order.total.amount,
    currency: order.total.currency,
    createdAt: order.createdAt,
    buyerName: order.buyerLabel,
    itemCount: 1,
    sellerItemNames: [] as string[],
    isOverdue: false,
    fulfillmentType: "DELIVERY" as const,
  };
}
