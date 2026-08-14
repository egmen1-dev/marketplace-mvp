import { listFavoriteIds } from "@/features/favorites";
import { prisma } from "@/lib/prisma";

import { isMarketplaceUxCompletionEnabled } from "./flags";
import type { BuyerHomeContext } from "./types";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export async function getBuyerHomeContext(userId?: string | null): Promise<BuyerHomeContext> {
  if (!isMarketplaceUxCompletionEnabled()) {
    return {
      enabled: false,
      greeting: "Добро пожаловать",
      favoritesCount: 0,
      ordersCount: 0,
      savedProductIds: [],
    };
  }

  const hour = new Date().getHours();
  let favoritesCount = 0;
  let ordersCount = 0;
  let savedProductIds: string[] = [];

  if (userId) {
    const [favIds, orders] = await Promise.all([
      listFavoriteIds(userId),
      prisma.order.count({ where: { userId } }),
    ]);
    favoritesCount = favIds.length;
    ordersCount = orders;
    savedProductIds = favIds.slice(0, 4);
  }

  return {
    enabled: true,
    greeting: `${greetingForHour(hour)} 👋`,
    favoritesCount,
    ordersCount,
    savedProductIds,
  };
}
