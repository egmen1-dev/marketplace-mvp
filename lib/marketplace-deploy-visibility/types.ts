export type FlagStatus = "ON" | "OFF";

export type ModuleVisibilityRow = {
  id: string;
  name: string;
  envVar: string;
  flagStatus: FlagStatus;
  codeExists: boolean;
  connectedToUi: boolean;
  onMainBranch: boolean;
  visibleOnStaging: boolean;
  buyerRoutes: string[];
  sellerRoutes: string[];
  adminRoutes: string[];
  blockers: string[];
  prNumber: number | null;
};

export type DeployShaSnapshot = {
  currentHead: string;
  mainSha: string;
  stagingSha: string | null;
  productionSha: string | null;
  stagingUrl: string;
  commitsAheadOfMain: number | null;
};

export type SystemFlagsSnapshot = {
  enabled: true;
  environment: string;
  buildCommit: string;
  buildTime: string;
  deploy: DeployShaSnapshot;
  modules: ModuleVisibilityRow[];
  requiredFlags: Array<{ envVar: string; status: FlagStatus }>;
};

export type DemoScenarioId = "new_seller" | "developing_seller" | "problem_seller";

export type DemoScenario = {
  id: DemoScenarioId;
  title: string;
  sellerEmail: string;
  sellerPassword: string;
  validatesModules: string[];
  setup: string[];
};

export type MarketplaceDebugSnapshot = {
  enabled: true;
  buildCommit: string;
  environment: string;
  activeModules: string[];
  inactiveModules: string[];
};
