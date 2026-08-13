export { isPromotionSurfacesEnabled } from "./flags";
export {
  endPromotionCampaign,
  pausePromotionCampaign,
  startPromotionCampaign,
} from "./lifecycle";
export {
  activatePlacementsForCampaign,
  deactivatePlacementsForCampaign,
  getPromotionBoostSignals,
  listPlacementsForCampaign,
  listPlacementsForProduct,
} from "./placements";
export {
  assertSellerOwnsProduct,
  isPromotionActive,
  PromotionForbiddenError,
  PromotionValidationError,
} from "./permissions";
export {
  evaluatePromotionReadiness,
  PROMOTION_MIN_QUALITY_SCORE,
} from "./readiness";
export {
  getCatalogPromotedProducts,
  getHomepagePromotedProducts,
  getPromotedProducts,
  isProductPromoted,
  listAdminPromotionCampaigns,
  listSellerPromotionRows,
} from "./queries";
export {
  DEFAULT_CAMPAIGN_PLACEMENTS,
  mapPriorityToBoostWeight,
  promotionSurfaceRoute,
  PROMOTION_SURFACE_LABELS,
  SELLER_SURFACE_LABELS,
} from "./surfaces";
export type { PromotionBoostSignal, PromotionSurfaceSpec } from "./surfaces";
export { PromotionSurfaceType } from "./surfaces";
export type {
  AdminPromotionFilter,
  AdminPromotionRow,
  PromotionCampaignDto,
  PromotionPlacementDto,
  PromotionReadiness,
  SellerPromotionRow,
} from "./types";
