export type SellerComponentStatus = "ready" | "needs_redesign" | "planned";

export type SellerDesignSystemComponent = {
  name: string;
  module: string;
  status: SellerComponentStatus;
  category: SellerComponentCategory;
  sprint?: number;
  notes?: string;
};

export type SellerComponentCategory =
  | "cards"
  | "metrics"
  | "charts"
  | "orders"
  | "finance"
  | "products"
  | "promotion"
  | "ai"
  | "status"
  | "banners"
  | "insights"
  | "layout"
  | "feedback";

/** Seller component registry — EPIC 86 architecture (no implementations yet) */
export const SELLER_DESIGN_SYSTEM_COMPONENTS: SellerDesignSystemComponent[] = [
  // Layout
  { name: "SellerPageShell", module: "design-system/seller/components/SellerPageShell", status: "planned", category: "layout", sprint: 1 },
  { name: "SellerSectionHeader", module: "design-system/seller/components/SellerSectionHeader", status: "planned", category: "layout", sprint: 1 },
  { name: "SellerHomeSkeleton", module: "design-system/seller/components/SellerHomeSkeleton", status: "planned", category: "layout", sprint: 1 },

  // Cards
  { name: "SellerSurfaceCard", module: "design-system/seller/components/SellerSurfaceCard", status: "planned", category: "cards", sprint: 1 },
  { name: "SellerTaskCard", module: "design-system/seller/components/SellerTaskCard", status: "planned", category: "cards", sprint: 1, notes: "Today block" },

  // Metrics
  { name: "SellerMetricHero", module: "design-system/seller/components/SellerMetricHero", status: "planned", category: "metrics", sprint: 1 },
  { name: "SellerMetricTile", module: "design-system/seller/components/SellerMetricTile", status: "planned", category: "metrics", sprint: 1 },
  { name: "SellerMetricStrip", module: "design-system/seller/components/SellerMetricStrip", status: "planned", category: "metrics", sprint: 2 },
  { name: "MetricCard (legacy)", module: "components/ui/cards", status: "needs_redesign", category: "metrics", notes: "Replace in Sprint 1" },

  // Charts
  { name: "SellerRevenueChart", module: "design-system/seller/components/SellerRevenueChart", status: "planned", category: "charts", sprint: 6 },
  { name: "SellerSparkline", module: "design-system/seller/components/SellerSparkline", status: "planned", category: "charts", sprint: 6 },
  { name: "SellerFunnelChart", module: "design-system/seller/components/SellerFunnelChart", status: "planned", category: "charts", sprint: 6 },

  // Orders
  { name: "SellerOrderCard", module: "design-system/seller/components/SellerOrderCard", status: "planned", category: "orders", sprint: 4 },
  { name: "SellerOrderQueue", module: "design-system/seller/components/SellerOrderQueue", status: "planned", category: "orders", sprint: 4 },
  { name: "SellerSlaBanner", module: "design-system/seller/components/SellerSlaBanner", status: "planned", category: "orders", sprint: 4 },
  { name: "OrderCard (buyer reuse)", module: "design-system/components/OrderCard", status: "needs_redesign", category: "orders", notes: "Seller variant Sprint 4" },

  // Finance
  { name: "SellerFinanceHero", module: "design-system/seller/components/SellerFinanceHero", status: "planned", category: "finance", sprint: 5 },
  { name: "SellerPayoutCard", module: "design-system/seller/components/SellerPayoutCard", status: "planned", category: "finance", sprint: 5 },
  { name: "SellerTransactionRow", module: "design-system/seller/components/SellerTransactionRow", status: "planned", category: "finance", sprint: 5 },
  { name: "WalletCard (legacy)", module: "components/ui/cards", status: "needs_redesign", category: "finance", notes: "Replace Sprint 5" },

  // Products
  { name: "SellerProductCard", module: "design-system/seller/components/SellerProductCard", status: "planned", category: "products", sprint: 2 },
  { name: "SellerProductKpiRow", module: "design-system/seller/components/SellerProductKpiRow", status: "planned", category: "products", sprint: 3 },
  { name: "SellerStockBadge", module: "design-system/seller/components/SellerStockBadge", status: "planned", category: "products", sprint: 2 },
  { name: "SellerProductCard (legacy)", module: "components/ui/SellerProductCard", status: "needs_redesign", category: "products", notes: "Replace Sprint 2" },

  // Promotion
  { name: "SellerCampaignCard", module: "design-system/seller/components/SellerCampaignCard", status: "planned", category: "promotion", sprint: 7 },
  { name: "SellerPromotionCta", module: "design-system/seller/components/SellerPromotionCta", status: "planned", category: "promotion", sprint: 7 },

  // AI
  { name: "SellerAiInsightCard", module: "design-system/seller/components/SellerAiInsightCard", status: "planned", category: "ai", sprint: 8 },
  { name: "SellerAiActionQueue", module: "design-system/seller/components/SellerAiActionQueue", status: "planned", category: "ai", sprint: 8 },
  { name: "SellerAiChatBubble", module: "design-system/seller/components/SellerAiChatBubble", status: "planned", category: "ai", sprint: 8 },

  // Status
  { name: "SellerStatusChip", module: "design-system/seller/components/SellerStatusChip", status: "planned", category: "status", sprint: 1 },
  { name: "SellerPriorityChip", module: "design-system/seller/components/SellerPriorityChip", status: "planned", category: "status", sprint: 1 },

  // Banners
  { name: "SellerPriorityBanner", module: "design-system/seller/components/SellerPriorityBanner", status: "planned", category: "banners", sprint: 1 },
  { name: "SellerOfflineBanner", module: "design-system/seller/components/SellerOfflineBanner", status: "planned", category: "banners", sprint: 1 },

  // Insights
  { name: "SellerInsightCard", module: "design-system/seller/components/SellerInsightCard", status: "planned", category: "insights", sprint: 1 },
  { name: "SellerGrowthCard", module: "design-system/seller/components/SellerGrowthCard", status: "planned", category: "insights", sprint: 1 },

  // Feedback
  { name: "SellerEmptyState", module: "design-system/seller/components/SellerEmptyState", status: "planned", category: "feedback", sprint: 1 },
  { name: "SellerSectionError", module: "design-system/seller/components/SellerSectionError", status: "planned", category: "feedback", sprint: 1 },
];

export const SELLER_COMPONENT_CATEGORIES: SellerComponentCategory[] = [
  "cards",
  "metrics",
  "charts",
  "orders",
  "finance",
  "products",
  "promotion",
  "ai",
  "status",
  "banners",
  "insights",
  "layout",
  "feedback",
];
