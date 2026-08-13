export type CommandCenterPrioritySource =
  | "SELLER_GROWTH"
  | "TRUST"
  | "LEARNING"
  | "PROMOTION"
  | "OPERATOR"
  | "EXECUTION"
  | "COMMUNICATION"
  | "EDUCATION"
  | "AI_EXPERIENCE";

export type CommandCenterUrgency = "HIGH" | "MEDIUM" | "LOW";

export type CommandCenterPriority = {
  id: string;
  title: string;
  source: CommandCenterPrioritySource;
  impact: string;
  urgency: CommandCenterUrgency;
  action: string;
  entity: string;
  why: string;
  howTo: string;
  href?: string;
  rankScore: number;
};

export type SellerHealthScores = {
  growthScore: number | null;
  trustScore: number | null;
  qualityScore: number | null;
  learningScore: number | null;
};

export type CommandCenterWidget = {
  id: string;
  title: string;
  body: string;
  badge?: string;
  href?: string;
  testId: string;
};

export type SellerCommandCenterDashboard = {
  enabled: boolean;
  title: string;
  health: SellerHealthScores;
  aiSummary: string;
  nextAction: CommandCenterPriority | null;
  opportunities: CommandCenterWidget[];
  whatWorks: CommandCenterWidget[];
  topPriorities: CommandCenterPriority[];
};

export type AdminCommandCenterDashboard = {
  enabled: boolean;
  marketplaceHealth: CommandCenterWidget[];
  aiPriorities: CommandCenterPriority[];
  executionStatus: CommandCenterWidget[];
  learning: CommandCenterWidget[];
  trust: CommandCenterWidget[];
  revenueOpportunities: CommandCenterWidget[];
  topPriorities: CommandCenterPriority[];
};

export type CommandCenterNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
  source: CommandCenterPrioritySource | "SYSTEM";
};
