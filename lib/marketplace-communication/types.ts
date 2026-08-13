export type CampaignStatus = "DRAFT" | "READY" | "ACTIVE" | "PAUSED" | "COMPLETED";

export type CampaignType =
  | "SELLER_ACTIVATION"
  | "PRODUCT_IMPROVEMENT"
  | "PROMOTION_INVITE"
  | "CATEGORY_GROWTH"
  | "BUYER_REACTIVATION";

export type AudienceKind =
  | "SELLERS_WITHOUT_PROMOTION"
  | "SELLERS_LOW_QUALITY_PRODUCTS"
  | "SELLERS_NO_SALES_30_DAYS"
  | "BUYERS_ABANDONED_CART"
  | "BUYERS_CATEGORY_INTEREST";

export type MessageChannel = "IN_APP" | "EMAIL" | "PUSH" | "TELEGRAM" | "SMS";

export type MessageStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "CANCELLED";

export type CommunicationAudience = {
  id: string;
  kind: AudienceKind;
  label: string;
  description: string;
  estimatedSize: number;
  source: string;
};

export type CommunicationTemplate = {
  id: string;
  campaignType: CampaignType;
  audienceKind: AudienceKind;
  subject: string;
  body: string;
  tone: "helpful" | "neutral";
};

export type SequenceStep = {
  dayOffset: number;
  label: string;
  templateId: string;
  description: string;
};

export type CommunicationSequence = {
  id: string;
  campaignType: CampaignType;
  name: string;
  steps: SequenceStep[];
};

export type PreparedMessage = {
  id: string;
  campaignId: string;
  templateId: string;
  audienceKind: AudienceKind;
  subject: string;
  body: string;
  status: MessageStatus;
  channel: MessageChannel;
};

export type MarketplaceCommunicationCampaign = {
  id: string;
  type: CampaignType;
  title: string;
  source: "MARKETPLACE_EXECUTION" | "MARKETPLACE_OPERATOR";
  audience: CommunicationAudience;
  status: CampaignStatus;
  createdAt: string;
  templateId: string;
  sequenceId: string | null;
  estimatedReach: number;
};

export type CampaignResults = {
  campaignsActive: number;
  messagesPendingApproval: number;
  messagesSent: number;
  estimatedClicks: number;
  headlines: string[];
};

export type SellerLotRecommendation = {
  productId: string | null;
  productTitle: string | null;
  views: number;
  purchases: number;
  headline: string;
  body: string;
  ctaLabel: string;
  href: string;
};

export type BuyerReactivationSignal = {
  id: string;
  category: string;
  query: string;
  daysSinceInterest: number;
  messagePreview: string;
  href: string;
};

export type MarketplaceCommunicationDashboard = {
  enabled: boolean;
  activeCampaigns: MarketplaceCommunicationCampaign[];
  audiences: CommunicationAudience[];
  templates: CommunicationTemplate[];
  pendingApproval: PreparedMessage[];
  sequences: CommunicationSequence[];
  results: CampaignResults;
};

export const COMMUNICATION_ENTITY_TYPE = "MARKETPLACE_COMMUNICATION" as const;
