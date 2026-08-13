export type ExecutionPlanStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "ARCHIVED";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type TaskOwner = "ADMIN" | "SELLER" | "OPS";

export type MarketplaceTaskType =
  | "SELLER_OUTREACH"
  | "PRODUCT_IMPROVEMENT"
  | "PROMOTION_LAUNCH"
  | "CATEGORY_EXPANSION"
  | "PRICE_OPTIMIZATION"
  | "BUYER_ACQUISITION"
  | "CONTENT_IMPROVEMENT";

export type MarketplaceTask = {
  id: string;
  planId: string;
  type: MarketplaceTaskType;
  title: string;
  description: string;
  owner: TaskOwner;
  priority: Priority;
  status: TaskStatus;
  impact: string;
  deadline: string | null;
  href?: string;
};

export type MarketplaceExecutionPlan = {
  id: string;
  title: string;
  source: "MARKETPLACE_OPERATOR";
  goal: string;
  priority: Priority;
  status: ExecutionPlanStatus;
  category: string | null;
  tasks: MarketplaceTask[];
  impactScore: number;
};

export type ExecutionProgress = {
  tasksTotal: number;
  tasksCompleted: number;
  tasksInProgress: number;
  impactScore: number;
  completionRate: number;
  weekSummary: string[];
};

export type SellerExecutionAction = {
  taskId: string;
  headline: string;
  description: string;
  fixLabel: string;
  href: string;
  productId?: string;
};

export type BuyerExecutionAction = {
  headline: string;
  description: string;
  actionLabel: string;
  href: string;
  query: string;
};

export type MarketplaceExecutionDashboard = {
  enabled: boolean;
  activePlans: MarketplaceExecutionPlan[];
  todaysPriorities: MarketplaceTask[];
  taskPipeline: MarketplaceTask[];
  completedTasks: MarketplaceTask[];
  progress: ExecutionProgress;
};

export const EXECUTION_ENTITY_TYPE = "MARKETPLACE_EXECUTION_TASK" as const;
