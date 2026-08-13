import { ANALYTICS_EVENTS, type AnalyticsEventName } from "@/lib/analytics/events";
import type { TrackServerEventInput } from "@/lib/analytics/track-server";
import {
  findActivePromotionAttribution,
  touchPromotionAttribution,
} from "@/lib/promotion/analytics/attribution";
import { isPromotionAnalyticsEnabled } from "@/lib/promotion/analytics/flags";
import {
  findActiveCampaignForProduct,
  incrementPromotionMetric,
} from "@/lib/promotion/analytics/metrics";
import { toPriceNumber } from "@/features/products/mappers";
import { prisma } from "@/lib/prisma";

function parseProductIds(entityId?: string): string[] {
  if (!entityId?.trim()) return [];
  return entityId
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function recordPromotionTouch(opts: {
  productId: string;
  visitorId?: string;
}): Promise<{ campaignId: string; productId: string } | null> {
  const campaign = await findActiveCampaignForProduct(opts.productId);
  if (!campaign) return null;

  if (opts.visitorId) {
    await touchPromotionAttribution({
      campaignId: campaign.id,
      productId: campaign.productId,
      visitorId: opts.visitorId,
    });
  }

  return { campaignId: campaign.id, productId: campaign.productId };
}

async function recordAttributedFunnelEvent(opts: {
  event: AnalyticsEventName;
  productId: string;
  visitorId?: string;
  revenueDelta?: number;
}): Promise<void> {
  if (!opts.visitorId) return;

  const attribution = await findActivePromotionAttribution({
    visitorId: opts.visitorId,
    productId: opts.productId,
  });
  if (!attribution) return;

  switch (opts.event) {
    case ANALYTICS_EVENTS.PRODUCT_VIEW:
      await incrementPromotionMetric({
        campaignId: attribution.campaignId,
        productId: attribution.productId,
        field: "productViews",
      });
      break;
    case ANALYTICS_EVENTS.ADD_TO_CART:
      await incrementPromotionMetric({
        campaignId: attribution.campaignId,
        productId: attribution.productId,
        field: "addToCart",
      });
      break;
    case ANALYTICS_EVENTS.CHECKOUT_START:
      await incrementPromotionMetric({
        campaignId: attribution.campaignId,
        productId: attribution.productId,
        field: "checkoutStarted",
      });
      break;
    default:
      break;
  }

  if (
    opts.event === ANALYTICS_EVENTS.PURCHASE_COMPLETE &&
    opts.revenueDelta != null
  ) {
    await incrementPromotionMetric({
      campaignId: attribution.campaignId,
      productId: attribution.productId,
      field: "orders",
      revenueDelta: opts.revenueDelta,
    });
  }
}

async function ingestPurchaseComplete(input: TrackServerEventInput): Promise<void> {
  if (!input.entityId) return;

  const order = await prisma.order.findUnique({
    where: { id: input.entityId },
    select: {
      total: true,
      items: { select: { productId: true, totalPrice: true } },
    },
  });
  if (!order) return;

  const orderTotal = toPriceNumber(order.total);

  if (input.visitorId) {
    for (const item of order.items) {
      const attribution = await findActivePromotionAttribution({
        visitorId: input.visitorId,
        productId: item.productId,
      });
      if (!attribution) continue;

      await incrementPromotionMetric({
        campaignId: attribution.campaignId,
        productId: attribution.productId,
        field: "orders",
        revenueDelta: toPriceNumber(item.totalPrice),
      });
    }
    return;
  }

  // Server-side purchase without visitorId — attribute once per promoted product in order.
  for (const item of order.items) {
    const campaign = await findActiveCampaignForProduct(item.productId);
    if (!campaign) continue;

    await incrementPromotionMetric({
      campaignId: campaign.id,
      productId: item.productId,
      field: "orders",
      revenueDelta: toPriceNumber(item.totalPrice),
    });
  }

  if (order.items.length === 0 && orderTotal > 0) {
    /* no-op */
  }
}

/**
 * Promotion analytics event pipeline — no PII, no ranking impact.
 * Called from trackServerEvent after AnalyticsEvent persist.
 */
export async function ingestPromotionAnalyticsEvent(
  input: TrackServerEventInput,
): Promise<void> {
  if (!isPromotionAnalyticsEnabled()) return;

  switch (input.event) {
    case ANALYTICS_EVENTS.PROMOTION_IMPRESSION: {
      const productIds = parseProductIds(input.entityId);
      for (const productId of productIds) {
        const touch = await recordPromotionTouch({
          productId,
          visitorId: input.visitorId,
        });
        if (!touch) continue;
        await incrementPromotionMetric({
          campaignId: touch.campaignId,
          productId: touch.productId,
          field: "impressions",
        });
      }
      break;
    }
    case ANALYTICS_EVENTS.PROMOTION_CLICK: {
      const productId = input.entityId?.trim();
      if (!productId) break;
      const touch = await recordPromotionTouch({
        productId,
        visitorId: input.visitorId,
      });
      if (!touch) break;
      await incrementPromotionMetric({
        campaignId: touch.campaignId,
        productId: touch.productId,
        field: "clicks",
      });
      break;
    }
    case ANALYTICS_EVENTS.PRODUCT_VIEW:
    case ANALYTICS_EVENTS.ADD_TO_CART:
    case ANALYTICS_EVENTS.CHECKOUT_START: {
      const productId = input.entityId?.trim();
      if (!productId) break;
      await recordAttributedFunnelEvent({
        event: input.event,
        productId,
        visitorId: input.visitorId,
      });
      break;
    }
    case ANALYTICS_EVENTS.PURCHASE_COMPLETE:
      await ingestPurchaseComplete(input);
      break;
    default:
      break;
  }
}
