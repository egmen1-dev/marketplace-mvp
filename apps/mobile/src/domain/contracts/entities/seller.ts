import type { Money } from "../value-objects/money";
import type { OrderId, ProductId, SellerId } from "../value-objects/ids";
import type { ProductSummary } from "./catalog";

export type SellerHomeHeader = {
  readonly storeName: string;
  readonly logoUrl: string | null;
  readonly isVerified: boolean;
};

export type SellerHomeTodaySummary = {
  readonly revenueToday: number | null;
  readonly ordersToday: number;
  readonly pendingOrders: number;
  readonly productsNeedAttention: number;
  readonly unreadNotifications: number;
};

export type SellerHomeRevenue = {
  readonly today: Money;
  readonly week: Money;
  readonly month: Money;
  readonly averageOrder: Money | null;
};

export type SellerHomeOrderBuckets = {
  readonly new: number;
  readonly processing: number;
  readonly awaitingShipment: number;
  readonly completed: number;
};

export type SellerHomeProductBuckets = {
  readonly active: number;
  readonly outOfStock: number;
  readonly drafts: number;
  readonly hidden: number;
  readonly lowStock: number | null;
};

export type SellerHomeTask = {
  readonly id: string;
  readonly title: string;
  readonly action: "orders" | "products" | "wallet" | "profile";
};

export type SellerHomeNotification = {
  readonly id: string;
  readonly kind: "new_order" | "order_cancelled" | "low_stock" | "system";
  readonly title: string;
  readonly body: string;
  readonly createdAt: string;
};

export type SellerHomeInsight = {
  readonly bestSellingCategory: string | null;
  readonly mostViewedProduct: string | null;
  readonly returningCustomersPct: number | null;
};

export type SellerHomeActivity = {
  readonly id: string;
  readonly kind: "order" | "product" | "wallet";
  readonly title: string;
  readonly subtitle: string;
  readonly createdAt: string;
};

export type SellerWorkspacePriority = "urgent" | "important" | "routine" | "completed";

export type SellerWorkspaceSource = "orders" | "products" | "wallet" | "notifications" | "promotion";

export type SellerWorkspaceSection =
  | "urgent"
  | "todays_work"
  | "quick_resume"
  | "recent_drafts"
  | "pending_publications"
  | "low_stock"
  | "awaiting_shipment"
  | "customer_replies"
  | "financial_actions"
  | "completed_today";

export type SellerWorkspaceItem = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string | null;
  readonly priority: SellerWorkspacePriority;
  readonly source: SellerWorkspaceSource;
  readonly section: SellerWorkspaceSection;
  readonly action: "orders" | "products" | "wallet" | "profile";
  readonly entityId: string | null;
  readonly resumeKey: string | null;
  readonly completedAt: string | null;
  readonly actionKind: SellerActionKind | null;
  readonly actionPayload: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly supportsUndo: boolean;
};

export type SellerActionKind =
  | "update_stock"
  | "publish_product"
  | "fix_moderation"
  | "ship_order"
  | "confirm_order"
  | "reply_buyer"
  | "withdraw_funds"
  | "complete_profile"
  | "resume_draft";

export type SellerActionInput = {
  readonly action: SellerActionKind;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
};

export type SellerActionUndo = {
  readonly action: SellerActionKind;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
};

export type SellerActionResult = {
  readonly ok: boolean;
  readonly action: SellerActionKind;
  readonly message: string;
  readonly errorCode?: string;
  readonly openUrl?: string | null;
  readonly undo?: SellerActionUndo | null;
};

export type SellerWorkspace = {
  readonly items: ReadonlyArray<SellerWorkspaceItem>;
  readonly counts: {
    readonly urgent: number;
    readonly important: number;
    readonly routine: number;
    readonly completed: number;
  };
};

export type SellerHomeDashboard = {
  readonly header: SellerHomeHeader | null;
  readonly todaySummary: SellerHomeTodaySummary | null;
  readonly revenue: SellerHomeRevenue | null;
  readonly orderBuckets: SellerHomeOrderBuckets | null;
  readonly productBuckets: SellerHomeProductBuckets | null;
  readonly tasks: ReadonlyArray<SellerHomeTask>;
  readonly notifications: ReadonlyArray<SellerHomeNotification>;
  readonly insights: SellerHomeInsight | null;
  readonly recentActivity: ReadonlyArray<SellerHomeActivity>;
  readonly workspace: SellerWorkspace;
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
