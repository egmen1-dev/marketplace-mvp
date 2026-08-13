import { ProductStatus } from "@prisma/client";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { parseBuyerIntent } from "@/lib/buyer-intelligence/intent-parser";
import { ROUTES } from "@/lib/constants";
import { getMarketplaceExecutionDashboard } from "@/lib/marketplace-execution/queries";
import { isMarketplaceExecutionEnabled } from "@/lib/marketplace-execution/flags";
import { prisma } from "@/lib/prisma";

import {
  buildCampaignsFromExecution,
  headlineForAudience,
} from "./campaigns";
import { buildCommunicationAudiences } from "./audiences";
import { isMarketplaceCommunicationEnabled } from "./flags";
import {
  markMessageApproved,
  markMessageSent,
  prepareCampaignMessages,
} from "./messages";
import { buildCommunicationSequences } from "./sequences";
import { buildCommunicationTemplates } from "./templates";
import type {
  BuyerReactivationSignal,
  CampaignResults,
  MarketplaceCommunicationDashboard,
  PreparedMessage,
  SellerLotRecommendation,
} from "./types";
import { COMMUNICATION_ENTITY_TYPE } from "./types";

async function loadMessageStatusOverrides(): Promise<
  Map<string, PreparedMessage["status"]>
> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.adminActionLog.findMany({
    where: {
      entityType: COMMUNICATION_ENTITY_TYPE,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { entityId: true, action: true },
  });

  const map = new Map<string, PreparedMessage["status"]>();
  for (const row of rows) {
    if (map.has(row.entityId)) continue;
    if (row.action === "MESSAGE_SENT") map.set(row.entityId, "SENT");
    else if (row.action === "MESSAGE_APPROVED") map.set(row.entityId, "APPROVED");
  }
  return map;
}

async function buildResults(
  campaigns: MarketplaceCommunicationDashboard["activeCampaigns"],
  messages: PreparedMessage[],
): Promise<CampaignResults> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [sent, clicked] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        event: ANALYTICS_EVENTS.COMMUNICATION_MESSAGE_SENT,
        createdAt: { gte: since },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        event: ANALYTICS_EVENTS.COMMUNICATION_CLICKED,
        createdAt: { gte: since },
      },
    }),
  ]);

  const headlines = campaigns
    .slice(0, 3)
    .map((c) => headlineForAudience(c.audience));

  return {
    campaignsActive: campaigns.filter((c) => c.status === "ACTIVE" || c.status === "READY")
      .length,
    messagesPendingApproval: messages.filter(
      (m) => m.status === "PENDING_APPROVAL",
    ).length,
    messagesSent: sent,
    estimatedClicks: clicked,
    headlines:
      headlines.length > 0
        ? headlines
        : ["Кампании готовятся на основе execution tasks"],
  };
}

export async function getMarketplaceCommunicationDashboard(): Promise<MarketplaceCommunicationDashboard> {
  if (!isMarketplaceCommunicationEnabled()) {
    return emptyDashboard();
  }

  const audiences = await buildCommunicationAudiences();
  const templates = buildCommunicationTemplates();
  const sequences = buildCommunicationSequences();

  const templateIds = new Map(
    templates.map((t) => [t.campaignType, t.id] as const),
  );
  const sequenceIds = new Map(
    sequences.map((s) => [s.campaignType, s.id] as const),
  );

  let tasks: Awaited<
    ReturnType<typeof getMarketplaceExecutionDashboard>
  >["taskPipeline"] = [];

  if (isMarketplaceExecutionEnabled()) {
    const execution = await getMarketplaceExecutionDashboard();
    tasks = execution.taskPipeline;
  }

  const campaigns = buildCampaignsFromExecution({
    tasks,
    audiences,
    templateIds,
    sequenceIds,
  });

  let messages = prepareCampaignMessages({ campaigns, templates });
  const overrides = await loadMessageStatusOverrides();
  messages = messages.map((m) => {
    const status = overrides.get(m.id);
    if (status === "SENT") return markMessageSent(m);
    if (status === "APPROVED") return markMessageApproved(m);
    return m;
  });

  const activeCampaigns = campaigns.filter(
    (c) => c.status === "ACTIVE" || c.status === "READY" || c.status === "DRAFT",
  );

  const results = await buildResults(activeCampaigns, messages);

  return {
    enabled: true,
    activeCampaigns,
    audiences,
    templates,
    pendingApproval: messages.filter((m) => m.status === "PENDING_APPROVAL"),
    sequences,
    results,
  };
}

function emptyDashboard(): MarketplaceCommunicationDashboard {
  return {
    enabled: false,
    activeCampaigns: [],
    audiences: [],
    templates: [],
    pendingApproval: [],
    sequences: [],
    results: {
      campaignsActive: 0,
      messagesPendingApproval: 0,
      messagesSent: 0,
      estimatedClicks: 0,
      headlines: ["MARKETPLACE_COMMUNICATION_ENABLED=false"],
    },
  };
}

/** Seller «Рекомендация от ЛОТ» on growth page. */
export async function getSellerLotRecommendation(
  sellerProfileId: string,
): Promise<SellerLotRecommendation | null> {
  if (!isMarketplaceCommunicationEnabled()) return null;

  const product = await prisma.product.findFirst({
    where: {
      sellerId: sellerProfileId,
      status: ProductStatus.ACTIVE,
      views: { gte: 5 },
      orderItems: { none: {} },
    },
    orderBy: { views: "desc" },
    select: { id: true, name: true, views: true },
  });

  if (!product) return null;

  return {
    productId: product.id,
    productTitle: product.name,
    views: product.views,
    purchases: 0,
    headline: "Рекомендация от ЛОТ",
    body: `Ваш товар «${product.name}»:\n\n${product.views} просмотров\n0 покупок\n\nПопробуйте улучшить карточку — фото, характеристики, описание.`,
    ctaLabel: "Исправить",
    href: `/account/products/${product.id}/edit`,
  };
}

/** Buyer reactivation foundation — preview only, no send. */
export async function getBuyerReactivationSignals(): Promise<
  BuyerReactivationSignal[]
> {
  if (!isMarketplaceCommunicationEnabled()) return [];

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const searches = await prisma.analyticsEvent.findMany({
    where: {
      event: ANALYTICS_EVENTS.SEARCH_USED,
      createdAt: { gte: since },
    },
    select: { entityId: true, createdAt: true },
    take: 500,
  });

  const signals: BuyerReactivationSignal[] = [];
  const seen = new Set<string>();

  for (const row of searches) {
    const q = row.entityId?.trim();
    if (!q || q.length < 3 || seen.has(q)) continue;
    seen.add(q);

    const intent = parseBuyerIntent(q);
    const category = intent.category ?? "Каталог";
    const days = Math.max(
      1,
      Math.round((Date.now() - row.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    );

    if (days >= 7) {
      signals.push({
        id: `react-${signals.length}`,
        category,
        query: q,
        daysSinceInterest: days,
        messagePreview: `В категории «${category}» появились новые товары`,
        href: `${ROUTES.CATALOG}?q=${encodeURIComponent(q)}`,
      });
    }

    if (signals.length >= 3) break;
  }

  return signals;
}

export { isMarketplaceCommunicationEnabled } from "./flags";
