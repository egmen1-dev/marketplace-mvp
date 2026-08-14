export type LaunchSeverity = "critical" | "warning" | "info";

export type LaunchAuditCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: LaunchSeverity;
  detail?: string;
};

export type LaunchReadinessReport = {
  enabled: boolean;
  score: number;
  label: "launch_ready" | "gaps" | "blocked";
  headline: string;
  sections: Array<{
    id: string;
    title: string;
    checks: LaunchAuditCheck[];
    score: number;
  }>;
  failedCritical: LaunchAuditCheck[];
};

export type PaymentProductionHealth = {
  enabled: boolean;
  stripeConfigured: boolean;
  webhookSecretConfigured: boolean;
  publishableKeyConfigured: boolean;
  pendingCount: number;
  failedCount: number;
  cancelledCount: number;
  succeededToday: number;
  checks: LaunchAuditCheck[];
};

export type DeliveryProductionHealth = {
  enabled: boolean;
  providerStatus: "OK" | "MOCK" | "ERROR";
  cdekConfigured: boolean;
  deliveryLayerEnabled: boolean;
  inTransit: number;
  overdue: number;
  problems: number;
  checks: LaunchAuditCheck[];
};

export type UxHealthReport = {
  enabled: boolean;
  productsWithoutPhotos: number;
  draftProducts: number;
  emptyDescriptions: number;
  checks: LaunchAuditCheck[];
};

export type MarketplaceHealthDashboard = {
  enabled: boolean;
  ordersToday: number;
  ordersFailed: number;
  ordersPending: number;
  paymentSuccessRate: number;
  paymentFailures: number;
  deliveryDelays: number;
  sellersActive: number;
  sellersBlocked: number;
  reviewsCount: number;
  moderationPending: number;
};

export type LaunchChecklistItem = {
  id: string;
  section: "technical" | "marketplace" | "trust";
  label: string;
  ready: boolean;
  detail?: string;
};

export type LaunchChecklistReport = {
  enabled: boolean;
  items: LaunchChecklistItem[];
  readyCount: number;
  totalCount: number;
};
