export type DeploymentDiffReport = {
  generatedAt: string;
  railway: { commit?: string; buildTime?: string; version?: string };
  expected: {
    commit: string;
    routesOnMain: string[];
    localBuildInfoCommit?: string;
  };
  missingRoutes: string[];
  unexpected404: string[];
  commitParity?: boolean;
  verdict: PromotionStatus;
};
