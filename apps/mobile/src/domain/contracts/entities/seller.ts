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
  | "ready_for_shipment"
  | "ready_for_pickup"
  | "mark_picked_up"
  | "cancel_order"
  | "reply_buyer"
  | "withdraw_funds"
  | "complete_profile"
  | "resume_draft"
  | "hide_product"
  | "move_to_draft"
  | "duplicate_product"
  | "delete_product";

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

export type SellerProductModeration = {
  readonly status: string;
  readonly reason: string | null;
  readonly updatedAt: string;
};

export type SellerProductFilter =
  | "all"
  | "active"
  | "drafts"
  | "moderation"
  | "needs_fix"
  | "low_stock"
  | "out_of_stock"
  | "hidden";

export type SellerProductSort =
  | "updated_desc"
  | "newest"
  | "oldest"
  | "stock_asc"
  | "stock_desc"
  | "price_asc"
  | "price_desc";

export type SellerProduct = ProductSummary & {
  readonly status: string;
  readonly views: number;
  readonly sku: string | null;
  readonly ordersCount: number;
  readonly updatedAt: string;
  readonly createdAt: string;
  readonly moderation: SellerProductModeration | null;
};

export type SellerProductPage = {
  readonly items: ReadonlyArray<SellerProduct>;
  readonly nextCursor: string | null;
  readonly fromCache: boolean;
  readonly total: number;
};

export type SellerProductsSummary = {
  readonly active: number;
  readonly drafts: number;
  readonly moderation: number;
  readonly needsFix: number;
  readonly outOfStock: number;
  readonly lowStock: number;
  readonly hidden: number;
};

export type SellerProductDetail = SellerProduct & {
  readonly description: string | null;
  readonly categoryName: string | null;
  readonly images: ReadonlyArray<{ readonly url: string; readonly isPrimary: boolean }>;
};

export type SellerProductEditorImage = {
  readonly url: string;
  readonly alt?: string | null;
  readonly pathname?: string | null;
  readonly isPrimary: boolean;
};

export type SellerProductEditorCharacteristic = {
  readonly definitionId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: string;
  readonly required: boolean;
  readonly unit: string | null;
  readonly options: ReadonlyArray<string> | null;
  readonly valueText?: string | null;
  readonly valueNumber?: number | null;
  readonly valueBoolean?: boolean | null;
  readonly displayValue?: string | null;
};

export type SellerProductEditorModeration = {
  readonly status: string;
  readonly reason: string | null;
  readonly issues: ReadonlyArray<string>;
  readonly qualityScore: number | null;
  readonly updatedAt: string;
};

export type SellerProductEditor = {
  readonly id: ProductId | null;
  readonly title: string;
  readonly description: string | null;
  readonly price: number;
  readonly compareAt: number | null;
  readonly currency: string;
  readonly stock: number;
  readonly sku: string | null;
  readonly status: string;
  readonly categoryId: string | null;
  readonly categoryName: string | null;
  readonly productTypeId: string | null;
  readonly productTypeName: string | null;
  readonly images: ReadonlyArray<SellerProductEditorImage>;
  readonly characteristics: ReadonlyArray<SellerProductEditorCharacteristic>;
  readonly moderation: SellerProductEditorModeration | null;
  readonly previewAvailable: boolean;
  readonly previewProductId: ProductId | null;
  readonly updatedAt: string | null;
  readonly createdAt: string | null;
};

export type SellerProductEditorInput = {
  readonly title: string;
  readonly description?: string | null;
  readonly price: number;
  readonly stock: number;
  readonly sku?: string | null;
  readonly categoryId?: string | null;
  readonly productTypeId?: string | null;
  readonly status?: string;
  readonly images?: ReadonlyArray<SellerProductEditorImage>;
  readonly characteristics?: ReadonlyArray<{
    readonly definitionId: string;
    readonly valueText?: string | null;
    readonly valueNumber?: number | null;
    readonly valueBoolean?: boolean | null;
    readonly valueJson?: unknown;
  }>;
};

export type SellerProductEditorSaveResult = {
  readonly id: ProductId;
  readonly status: string;
  readonly updatedAt: string;
  readonly moderationPending?: boolean;
};

export type SellerCategoryOption = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly parentId: string | null;
  readonly productCount: number;
  readonly pathLabel?: string | null;
};

export type SellerTaxonomyBrowse = {
  readonly children: ReadonlyArray<SellerCategoryOption>;
  readonly productTypes: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly slug: string;
    readonly categoryId: string;
    readonly breadcrumb: ReadonlyArray<string>;
  }>;
  readonly characteristics?: ReadonlyArray<SellerProductEditorCharacteristic>;
};

export type SellerProductImageUploadResult = {
  readonly url: string;
  readonly pathname: string;
};

export type SellerOrderFilter =
  | "all"
  | "new"
  | "processing"
  | "ready_shipment"
  | "awaiting_pickup"
  | "shipped"
  | "completed"
  | "cancelled"
  | "overdue"
  | "problem";

export type SellerOrderSummary = {
  readonly id: OrderId;
  readonly orderNumber: string;
  readonly status: string;
  readonly fulfillmentType: "DELIVERY" | "SELLER_PICKUP";
  readonly isOverdue: boolean;
  readonly total: Money;
  readonly sellerSubtotal: Money;
  readonly buyerLabel: string | null;
  readonly createdAt: string;
  readonly itemCount: number;
  readonly previewTitle: string | null;
};

export type SellerOrderPage = {
  readonly items: ReadonlyArray<SellerOrderSummary>;
  readonly nextCursor: string | null;
  readonly fromCache: boolean;
  readonly total: number;
};

export type SellerOrdersSummary = {
  readonly newCount: number;
  readonly inProgress: number;
  readonly awaitingShipment: number;
  readonly readyForPickup: number;
  readonly overdue: number;
};

export type SellerOrderLineItem = {
  readonly id: string;
  readonly productName: string;
  readonly quantity: number;
  readonly totalPrice: Money;
  readonly sku: string | null;
};

export type SellerOrderDetail = SellerOrderSummary & {
  readonly buyerEmail: string | null;
  readonly updatedAt: string;
  readonly sellerItemNames: ReadonlyArray<string>;
  readonly items: ReadonlyArray<SellerOrderLineItem>;
};

export type SellerPublicProfile = {
  readonly id: SellerId;
  readonly storeName: string;
  readonly subtitle: string | null;
  readonly rating: number | null;
  readonly productCount: number;
};

export type SellerIntelligenceSectionId =
  | "todays_risks"
  | "todays_opportunities"
  | "products_losing_sales"
  | "products_gaining_sales"
  | "low_stock_forecast"
  | "revenue_trend"
  | "top_products"
  | "slow_products"
  | "pending_actions"
  | "completed_actions";

export type SellerInsightEvidence = {
  readonly label: string;
  readonly value: string;
};

export type SellerInsightCta = {
  readonly label: string;
  readonly actionKind: SellerActionKind | null;
  readonly actionPayload: Readonly<Record<string, string | number | boolean | null>> | null;
  readonly route: "orders" | "products" | "wallet" | "profile" | null;
  readonly entityId: string | null;
};

export type SellerInsight = {
  readonly id: string;
  readonly title: string;
  readonly evidence: ReadonlyArray<SellerInsightEvidence>;
  readonly reason: string;
  readonly recommendedAction: string;
  readonly cta: SellerInsightCta;
};

export type SellerIntelligenceSection = {
  readonly id: SellerIntelligenceSectionId;
  readonly title: string;
  readonly insights: ReadonlyArray<SellerInsight>;
};

export type SellerRevenueTrendPoint = {
  readonly date: string;
  readonly revenue: number;
  readonly orders: number;
};

export type SellerIntelligenceDashboard = {
  readonly generatedAt: string;
  readonly sections: ReadonlyArray<SellerIntelligenceSection>;
  readonly revenueTrend: ReadonlyArray<SellerRevenueTrendPoint> | null;
  readonly evidenceOnly: true;
};
