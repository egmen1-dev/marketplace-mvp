export { isMarketplaceCommunicationEnabled } from "./flags";
export {
  approveAndSendCommunicationMessageAction,
  approveCommunicationMessageAction,
  sendCommunicationMessageAction,
} from "./actions";
export type { CommunicationActionResult } from "./actions";
export { buildCommunicationAudiences, pickAudienceForCampaignType } from "./audiences";
export {
  buildCampaignsFromExecution,
  headlineForAudience,
} from "./campaigns";
export {
  markMessageApproved,
  markMessageSent,
  prepareCampaignMessages,
} from "./messages";
export {
  assertMarketplaceCommunicationAccess,
  assertSellerCommunicationView,
  MarketplaceCommunicationForbiddenError,
} from "./permissions";
export {
  getBuyerReactivationSignals,
  getMarketplaceCommunicationDashboard,
  getSellerLotRecommendation,
} from "./queries";
export { buildCommunicationSequences, sequenceForType } from "./sequences";
export {
  buildCommunicationTemplates,
  templateForCampaign,
} from "./templates";
export type {
  AudienceKind,
  BuyerReactivationSignal,
  CampaignResults,
  CampaignStatus,
  CampaignType,
  CommunicationAudience,
  CommunicationSequence,
  CommunicationTemplate,
  MarketplaceCommunicationCampaign,
  MarketplaceCommunicationDashboard,
  MessageChannel,
  MessageStatus,
  PreparedMessage,
  SellerLotRecommendation,
  SequenceStep,
} from "./types";
export { COMMUNICATION_ENTITY_TYPE } from "./types";
