export { isMarketplaceIntelligenceEnabled } from "./flags";
export { detectMarketplaceOpportunities } from "./opportunities";
export {
  buildMarketplaceHealth,
  buildMarketplaceProblems,
  buildRevenueOpportunities,
} from "./insights";
export { generateMarketplaceRecommendations } from "./recommendations";
export {
  collectBuyerDemandQueries,
  collectMarketplaceSignals,
} from "./signals";
export {
  assertMarketplaceIntelligenceAccess,
  getBuyerDemandInsight,
  getMarketplaceIntelligenceDashboard,
  getSellerMarketplaceConnection,
  MarketplaceIntelligenceForbiddenError,
} from "./queries";
export type {
  BuyerDemandInsight,
  ImpactLevel,
  MarketplaceHealth,
  MarketplaceIntelligenceDashboard,
  MarketplaceOpportunity,
  MarketplaceProblem,
  MarketplaceRecommendation,
  MarketplaceSignal,
  MarketplaceSignalType,
  RevenueOpportunity,
  SellerMarketplaceConnection,
  SellerMarketplaceInsight,
  SignalSeverity,
} from "./types";
