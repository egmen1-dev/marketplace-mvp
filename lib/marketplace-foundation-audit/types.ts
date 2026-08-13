export type AuditSeverity = "critical" | "warning" | "info";

export type AuditCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: AuditSeverity;
  detail?: string;
};

export type AuditArea =
  | "buyer"
  | "seller"
  | "order"
  | "payment"
  | "delivery"
  | "review"
  | "moderation"
  | "operations";

export type AuditAreaResult = {
  area: AuditArea;
  title: string;
  checks: AuditCheck[];
  score: number;
  weight: number;
};

export type FoundationReadinessScore = {
  total: number;
  label: "ready" | "gaps" | "critical";
  headline: string;
  areas: AuditAreaResult[];
};

export type OrderLifecycleHealth = {
  deliveryTransitions: number;
  pickupTransitions: number;
  totalTransitions: number;
  missing: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
};

export type FoundationRecommendation = {
  id: string;
  problem: string;
  cause: string;
  recommendation: string;
  severity: AuditSeverity;
};

export type LaunchChecklistItem = {
  id: string;
  label: string;
  ready: boolean;
  detail?: string;
};

export type CriticalIssue = {
  id: string;
  title: string;
  severity: AuditSeverity;
};

export type AdminOperationsOverview = {
  enabled: boolean;
  orders: {
    newCount: number;
    problemCount: number;
    overdueCount: number;
  };
  sellers: {
    newCount: number;
    activeCount: number;
    problemCount: number;
  };
  products: {
    pendingReview: number;
    rejected: number;
    noSales: number;
  };
  finance: {
    pendingPayments: number;
    pendingPayouts: number;
    openDisputes: number;
  };
  trust: {
    openReports: number;
    riskFlags: number;
  };
};

export type MarketplaceFoundationReport = {
  enabled: boolean;
  score: FoundationReadinessScore;
  orderLifecycle: OrderLifecycleHealth;
  recommendations: FoundationRecommendation[];
  checklist: LaunchChecklistItem[];
  criticalIssues: CriticalIssue[];
  operations: AdminOperationsOverview;
};

export const AREA_WEIGHTS: Record<AuditArea, number> = {
  buyer: 20,
  seller: 20,
  order: 15,
  payment: 15,
  delivery: 10,
  review: 10,
  moderation: 5,
  operations: 5,
};
