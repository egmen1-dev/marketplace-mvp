import { getOwnedProduct, getProductById } from "@/features/products";
import { prisma } from "@/lib/prisma";
import { getSellerDiscoveryTips } from "@/lib/marketplace-discovery/queries";

import { SELLER_CONTENT_OPTIONS, detectGrowthOpportunities } from "./campaigns";
import { isMarketplaceSocialGrowthEnabled } from "./flags";
import type { AdminSocialGrowthDashboard, SellerSocialTools } from "./types";
import { validateSocialContent } from "./trust-guard";

export async function getSellerSocialTools(input: {
  sellerProfileId: string;
  productId: string;
}): Promise<SellerSocialTools> {
  if (!isMarketplaceSocialGrowthEnabled()) {
    return {
      enabled: false,
      productId: input.productId,
      productTitle: "",
      canGenerate: false,
      blockers: [],
      options: [],
    };
  }

  const product = await getOwnedProduct(input.productId, input.sellerProfileId);
  if (!product) {
    return {
      enabled: true,
      productId: input.productId,
      productTitle: "",
      canGenerate: false,
      blockers: ["Товар не найден"],
      options: [],
    };
  }

  const [validation, discoveryTips] = await Promise.all([
    validateSocialContent({
      product,
      photoCount: product.images.length,
    }),
    getSellerDiscoveryTips(input.sellerProfileId),
  ]);

  const blockers = [...validation.blockers];
  if (!discoveryTips.canAppear) {
    blockers.push("Улучшите карточку для попадания в Находки");
  }

  return {
    enabled: true,
    productId: product.id,
    productTitle: product.title,
    canGenerate: validation.allowed,
    blockers: [...new Set(blockers)].slice(0, 4),
    options: SELLER_CONTENT_OPTIONS,
  };
}

export async function getAdminSocialGrowthDashboard(): Promise<AdminSocialGrowthDashboard> {
  if (!isMarketplaceSocialGrowthEnabled()) {
    return {
      enabled: false,
      topShareCards: [],
      topSharedProducts: [],
      creatorStats: [],
      opportunities: [],
    };
  }

  const events = await prisma.analyticsEvent.findMany({
    where: {
      event: {
        in: [
          "share_card_view",
          "content_shared",
          "creator_collection_view",
          "viral_card_opened",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const shareViews = new Map<string, number>();
  const shares = new Map<string, number>();
  const creatorViews = new Map<string, number>();

  for (const e of events) {
    const id = e.entityId ?? "";
    if (!id) continue;
    if (e.event === "share_card_view" || e.event === "viral_card_opened") {
      const productId = id.split(":")[0]!;
      shareViews.set(productId, (shareViews.get(productId) ?? 0) + 1);
    }
    if (e.event === "content_shared") {
      shares.set(id, (shares.get(id) ?? 0) + 1);
    }
    if (e.event === "creator_collection_view") {
      creatorViews.set(id, (creatorViews.get(id) ?? 0) + 1);
    }
  }

  const popular = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { views: "desc" },
    take: 10,
    select: { id: true, name: true, views: true, favoritesCount: true },
  });

  const opportunities = detectGrowthOpportunities(
    popular.map((p) => ({
      product: {
        id: p.id,
        title: p.name,
      } as import("@/features/products/types").ProductListItem,
      discoveryScore: Math.min(100, p.views / 2 + p.favoritesCount * 3),
      socialViews: shareViews.get(p.id) ?? 0,
    })),
  ).map((o) => o.reason);

  const creatorCollections = await prisma.socialCollection.findMany({
    orderBy: { views: "desc" },
    take: 5,
    select: { id: true, title: true, views: true },
  });

  return {
    enabled: true,
    topShareCards: [...shareViews.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, views]) => ({ productId, views })),
    topSharedProducts: [...shares.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([productId, shares]) => ({ productId, shares })),
    creatorStats: creatorCollections.map((c) => ({
      collectionId: c.id,
      title: c.title,
      views: c.views,
    })),
    opportunities:
      opportunities.length > 0
        ? opportunities
        : [
            "Создайте share-карточки для товаров с высоким рейтингом",
            "Продвигайте SEO-страницы /social/* в соцсетях",
          ],
  };
}

export async function getShareCardProduct(productId: string) {
  if (!isMarketplaceSocialGrowthEnabled()) return null;
  return getProductById(productId, null);
}
