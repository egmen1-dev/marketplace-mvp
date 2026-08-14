import { getSellerDashboardStats } from "@/features/seller/queries";
import { sellerProductEditPath } from "@/lib/constants";
import { buildNextBusinessAction } from "@/lib/seller-business-intelligence/next-action";
import { getSellerBusinessDashboard, isSellerBusinessIntelligenceEnabled } from "@/lib/seller-business-intelligence";
import { loadSellerProgressSignals } from "@/lib/seller-lifecycle/progress";

import { isMarketplaceUxCompletionEnabled } from "./flags";
import type { AiExplanation, SellerHomeSummary } from "./types";

export async function getSellerHomeSummary(
  sellerProfileId: string,
): Promise<SellerHomeSummary> {
  if (!isMarketplaceUxCompletionEnabled()) {
    return {
      enabled: false,
      headline: "",
      stats: [],
      nextStep: null,
      attention: [],
    };
  }

  const [stats, signals, business] = await Promise.all([
    getSellerDashboardStats(sellerProfileId),
    loadSellerProgressSignals(sellerProfileId),
    isSellerBusinessIntelligenceEnabled()
      ? getSellerBusinessDashboard(sellerProfileId)
      : Promise.resolve(null),
  ]);

  const nextAction =
    business?.nextAction ??
    buildNextBusinessAction({
      signals,
      topPriority: null,
      journeyCoach: null,
      topProduct: undefined,
    });

  const attention: string[] = [];
  if (stats.lowStockCount > 0) {
    attention.push(`${stats.lowStockCount} товар(ов) с низким остатком`);
  }
  if (stats.ordersCount > 0 && stats.salesCount === 0) {
    attention.push("Есть заказы — проверьте обработку");
  }

  return {
    enabled: true,
    headline: "Мой бизнес",
    stats: [
      { label: "📦 Заказы", value: String(stats.ordersCount) },
      { label: "👀 Просмотры", value: String(stats.viewsSum) },
      { label: "💰 Выручка", value: `${Math.round(stats.revenue)} ₽` },
    ],
    nextStep: nextAction
      ? {
          title: nextAction.title,
          why: nextAction.why,
          benefit: nextAction.benefit,
          ctaLabel: nextAction.ctaLabel,
          ctaHref: nextAction.ctaHref,
        }
      : null,
    attention,
  };
}

export function aiExplanationFromNextStep(
  step: SellerHomeSummary["nextStep"],
): AiExplanation | null {
  if (!step) return null;
  return {
    title: step.title,
    why: step.why,
    action: step.title,
    result: step.benefit,
    ctaLabel: step.ctaLabel,
    ctaHref: step.ctaHref,
  };
}

export function defaultSellerProductFix(productId: string, productName: string): AiExplanation {
  return {
    title: `Добавьте фотографии товара «${productName}»`,
    why: "Карточки с качественными фото чаще выбирают покупатели.",
    action: "Добавить 3 фотографии",
    result: "Покупателю будет проще принять решение.",
    ctaLabel: "Исправить",
    ctaHref: sellerProductEditPath(productId),
  };
}
