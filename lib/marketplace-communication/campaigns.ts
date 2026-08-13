import type { MarketplaceTask } from "@/lib/marketplace-execution/types";

import type {
  CampaignType,
  CommunicationAudience,
  MarketplaceCommunicationCampaign,
} from "./types";

function campaignTypeFromTask(task: MarketplaceTask): CampaignType {
  switch (task.type) {
    case "PRODUCT_IMPROVEMENT":
    case "CONTENT_IMPROVEMENT":
      return "PRODUCT_IMPROVEMENT";
    case "PROMOTION_LAUNCH":
      return "PROMOTION_INVITE";
    case "SELLER_OUTREACH":
      return "SELLER_ACTIVATION";
    case "CATEGORY_EXPANSION":
      return "CATEGORY_GROWTH";
    case "BUYER_ACQUISITION":
      return "BUYER_REACTIVATION";
    default:
      return "SELLER_ACTIVATION";
  }
}

function campaignTitle(type: CampaignType, taskTitle: string): string {
  if (type === "PRODUCT_IMPROVEMENT") {
    return "Улучшение карточек продавцов";
  }
  if (type === "PROMOTION_INVITE") {
    return "Приглашение к продвижению";
  }
  if (type === "CATEGORY_GROWTH") {
    return "Рост категории — коммуникация с покупателями";
  }
  if (type === "BUYER_REACTIVATION") {
    return "Reactivation покупателей";
  }
  return taskTitle.slice(0, 80);
}

/** Build campaigns from execution tasks (communication prep). */
export function buildCampaignsFromExecution(input: {
  tasks: MarketplaceTask[];
  audiences: CommunicationAudience[];
  templateIds: Map<CampaignType, string>;
  sequenceIds: Map<CampaignType, string>;
}): MarketplaceCommunicationCampaign[] {
  const campaigns: MarketplaceCommunicationCampaign[] = [];
  const seen = new Set<CampaignType>();
  let seq = 0;

  for (const task of input.tasks) {
    const type = campaignTypeFromTask(task);
    if (seen.has(type)) continue;
    seen.add(type);

    const audience =
      input.audiences.find((a) => {
        if (type === "PRODUCT_IMPROVEMENT") {
          return a.kind === "SELLERS_LOW_QUALITY_PRODUCTS";
        }
        if (type === "PROMOTION_INVITE") {
          return a.kind === "SELLERS_WITHOUT_PROMOTION";
        }
        if (type === "BUYER_REACTIVATION") {
          return a.kind === "BUYERS_ABANDONED_CART";
        }
        if (type === "CATEGORY_GROWTH") {
          return a.kind === "BUYERS_CATEGORY_INTEREST";
        }
        return a.kind === "SELLERS_NO_SALES_30_DAYS";
      }) ?? input.audiences[0];

    if (!audience) continue;

    campaigns.push({
      id: `campaign-${seq++}`,
      type,
      title: campaignTitle(type, task.title),
      source: "MARKETPLACE_EXECUTION",
      audience,
      status: task.priority === "HIGH" ? "READY" : "DRAFT",
      createdAt: new Date().toISOString(),
      templateId: input.templateIds.get(type) ?? "tpl-seller-improvement",
      sequenceId: input.sequenceIds.get(type) ?? null,
      estimatedReach: audience.estimatedSize,
    });
  }

  if (
    !seen.has("PRODUCT_IMPROVEMENT") &&
    input.audiences.some((a) => a.kind === "SELLERS_LOW_QUALITY_PRODUCTS")
  ) {
    const audience = input.audiences.find(
      (a) => a.kind === "SELLERS_LOW_QUALITY_PRODUCTS",
    )!;
    campaigns.unshift({
      id: `campaign-${seq++}`,
      type: "PRODUCT_IMPROVEMENT",
      title: "Улучшение карточек продавцов",
      source: "MARKETPLACE_EXECUTION",
      audience,
      status: audience.estimatedSize >= 50 ? "READY" : "DRAFT",
      createdAt: new Date().toISOString(),
      templateId: "tpl-seller-improvement",
      sequenceId: "seq-product-improvement",
      estimatedReach: audience.estimatedSize,
    });
  }

  return campaigns.slice(0, 6);
}

export function headlineForAudience(audience: CommunicationAudience): string {
  return `${audience.estimatedSize} ${audience.label.toLowerCase()}`;
}
