export type MobileSellerHomeHeader = {
  storeName: string;
  logoUrl: string | null;
  isVerified: boolean;
};

export type MobileSellerHomeTodaySummary = {
  revenueToday: number | null;
  ordersToday: number;
  pendingOrders: number;
  productsNeedAttention: number;
  unreadNotifications: number;
};

export type MobileSellerHomeRevenue = {
  today: number;
  week: number;
  month: number;
  averageOrder: number | null;
};

export type MobileSellerHomeOrderBuckets = {
  new: number;
  processing: number;
  awaitingShipment: number;
  completed: number;
};

export type MobileSellerHomeProductBuckets = {
  active: number;
  outOfStock: number;
  drafts: number;
  hidden: number;
  lowStock: number | null;
};

export type MobileSellerHomeTask = {
  id: string;
  title: string;
  action: "orders" | "products" | "wallet" | "profile";
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

export type SellerActionKind =
  | "update_stock"
  | "publish_product"
  | "fix_moderation"
  | "ship_order"
  | "confirm_order"
  | "reply_buyer"
  | "withdraw_funds"
  | "complete_profile"
  | "resume_draft"
  | "hide_product"
  | "move_to_draft"
  | "duplicate_product"
  | "delete_product";

export type MobileSellerWorkspaceItem = {
  id: string;
  title: string;
  subtitle: string | null;
  priority: SellerWorkspacePriority;
  source: SellerWorkspaceSource;
  section: SellerWorkspaceSection;
  action: "orders" | "products" | "wallet" | "profile";
  entityId: string | null;
  resumeKey: string | null;
  completedAt: string | null;
  actionKind: SellerActionKind | null;
  actionPayload: Record<string, string | number | boolean | null> | null;
  supportsUndo: boolean;
};

export type MobileSellerWorkspace = {
  items: MobileSellerWorkspaceItem[];
  counts: {
    urgent: number;
    important: number;
    routine: number;
    completed: number;
  };
};

export type MobileSellerHomeNotification = {
  id: string;
  kind: "new_order" | "order_cancelled" | "low_stock" | "system";
  title: string;
  body: string;
  createdAt: string;
};

export type MobileSellerHomeInsight = {
  bestSellingCategory: string | null;
  mostViewedProduct: string | null;
  returningCustomersPct: number | null;
};

export type MobileSellerHomeActivity = {
  id: string;
  kind: "order" | "product" | "wallet";
  title: string;
  subtitle: string;
  createdAt: string;
};

export type MobileSellerHomePayload = {
  header: MobileSellerHomeHeader | null;
  todaySummary: MobileSellerHomeTodaySummary | null;
  revenue: MobileSellerHomeRevenue | null;
  orderBuckets: MobileSellerHomeOrderBuckets | null;
  productBuckets: MobileSellerHomeProductBuckets | null;
  tasks: MobileSellerHomeTask[];
  notifications: MobileSellerHomeNotification[];
  insights: MobileSellerHomeInsight | null;
  recentActivity: MobileSellerHomeActivity[];
  workspace: MobileSellerWorkspace;
  money: { available: number; pending: number };
  orders: { needAction: number };
  products: { active: number; needAttention: number };
  promotion: { active: number };
  intelligence: { topAction: string | null; productId: string | null };
  advisoryOnly: true;
};

export function buildMobileSellerHomePayload(input?: Partial<MobileSellerHomePayload>): MobileSellerHomePayload {
  return {
    header: input?.header ?? null,
    todaySummary: input?.todaySummary ?? null,
    revenue: input?.revenue ?? null,
    orderBuckets: input?.orderBuckets ?? null,
    productBuckets: input?.productBuckets ?? null,
    tasks: input?.tasks ?? [],
    notifications: input?.notifications ?? [],
    insights: input?.insights ?? null,
    recentActivity: input?.recentActivity ?? [],
    workspace: input?.workspace ?? { items: [], counts: { urgent: 0, important: 0, routine: 0, completed: 0 } },
    money: input?.money ?? { available: 0, pending: 0 },
    orders: input?.orders ?? { needAction: 0 },
    products: input?.products ?? { active: 0, needAttention: 0 },
    promotion: input?.promotion ?? { active: 0 },
    intelligence: input?.intelligence ?? { topAction: null, productId: null },
    advisoryOnly: true,
  };
}
