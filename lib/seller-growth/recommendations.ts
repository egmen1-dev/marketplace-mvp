import { ROUTES, sellerProductEditPath } from "@/lib/constants";
import type { SellerProductHealthRow } from "@/lib/seller-growth/seller-health";
import type {
  SellerAction,
  SellerActionPriority,
} from "@/lib/seller-growth/types";

function action(
  partial: SellerAction,
): SellerAction {
  return partial;
}

export function generateSellerActions(
  products: SellerProductHealthRow[],
): SellerAction[] {
  const actions: SellerAction[] = [];

  for (const product of products) {
    if (product.blockers.some((b) => b.includes("фото"))) {
      actions.push(
        action({
          priority: "HIGH",
          type: "IMPROVE_PRODUCT",
          action: "Добавить фото товара",
          impact: "+15% вероятность покупки",
          productId: product.id,
          target: product.name,
          href: sellerProductEditPath(product.id),
        }),
      );
    }

    if (product.stock === 0) {
      actions.push(
        action({
          priority: "HIGH",
          type: "ADD_STOCK",
          action: "Пополнить остатки",
          impact: "Восстановит возможность покупки",
          productId: product.id,
          target: product.name,
          href: sellerProductEditPath(product.id),
        }),
      );
    }

    if (product.ready && !product.isPromoted && product.qualityScore >= 55) {
      actions.push(
        action({
          priority: product.qualityScore >= 70 ? "HIGH" : "MEDIUM",
          type: "START_PROMOTION",
          action: "Запустить продвижение",
          impact: "+20–40% просмотров",
          productId: product.id,
          target: product.name,
          href: ROUTES.ACCOUNT_PROMOTIONS,
        }),
      );
    }

    if (
      product.productViews >= 20 &&
      product.orderCount === 0 &&
      product.addToCart <= 1
    ) {
      actions.push(
        action({
          priority: "MEDIUM",
          type: "ADJUST_PRICE",
          action: "Проверить цену относительно рынка",
          impact: "Может повысить конверсию",
          productId: product.id,
          target: product.name,
          href: sellerProductEditPath(product.id),
        }),
      );
    }
  }

  if (products.length < 3) {
    actions.push(
      action({
        priority: "MEDIUM",
        type: "CREATE_PRODUCT",
        action: "Добавить новый товар",
        impact: "Расширит охват покупателей",
        href: ROUTES.ACCOUNT_PRODUCTS_NEW,
      }),
    );
  }

  const priorityOrder: Record<SellerActionPriority, number> = {
    HIGH: 0,
    MEDIUM: 1,
    LOW: 2,
  };

  const seen = new Set<string>();
  return actions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .filter((item) => {
      const key = `${item.type}:${item.productId ?? "global"}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export function pickNextAction(actions: SellerAction[]): SellerAction | null {
  return actions[0] ?? null;
}

export function buildOpportunities(
  products: SellerProductHealthRow[],
): import("@/lib/seller-growth/types").SellerGrowthOpportunities {
  const readyForPromotion = products.filter(
    (p) => p.ready && !p.isPromoted && p.stock > 0,
  );
  const needsImprovement = products.filter((p) => !p.ready);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= 2);

  return {
    readyForPromotionCount: readyForPromotion.length,
    needsImprovementCount: needsImprovement.length,
    lowStockCount: lowStock.length,
    singleProductSeller: products.length === 1,
  };
}
