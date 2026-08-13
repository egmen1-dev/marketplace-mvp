export { isSellerLifecycleEnabled } from "./flags";
export {
  trackLifecycleStageTransition,
  trackSellerActivationCompleted,
  trackSellerFirstPayout,
  trackSellerFirstSale,
  trackSellerJourneyView,
  trackSellerMilestoneReached,
  trackSellerNextStepClick,
} from "./analytics";
export {
  buildJourneySteps,
  computeJourneyProgress,
  pickNextJourneyStep,
  resolveLifecycleStage,
} from "./journey";
export { detectMilestones, latestAchievedMilestone } from "./milestones";
export {
  assertAdminSellerLifecycleAccess,
  assertSellerLifecycleAccess,
  SellerLifecycleForbiddenError,
} from "./permissions";
export {
  emptySellerSignals,
  loadSellerProgressSignals,
} from "./progress";
export type { SellerProgressSignals } from "./progress";
export {
  buildEmptyStateCopy,
  buildSellerJourneyCoach,
} from "./recommendations";
export {
  getAdminSellerFunnel,
  getSellerLifecycleDashboard,
  getSellerLifecycleNotifications,
} from "./queries";
export {
  JOURNEY_STEP_DEFINITIONS,
  milestoneEmoji,
  milestoneLabel,
  stageIndex,
  stageLabel,
  STAGE_ORDER,
} from "./types";
export type {
  AdminSellerFunnel,
  AdminSellerFunnelStep,
  SellerJourneyCoach,
  SellerJourneyStep,
  SellerLifecycleDashboard,
  SellerLifecycleNotification,
  SellerLifecycleStage,
  SellerMilestone,
  SellerMilestoneType,
} from "./types";
