import { listProducts } from "@/features/products";
import { prisma } from "@/lib/prisma";

import { isDiscoveryDailyFindsEnabled } from "./flags";
import { pickDailyFindCard } from "./feeds";
import type { DailyFind } from "./types";

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export async function getDailyFind(userId?: string | null): Promise<DailyFind> {
  if (!isDiscoveryDailyFindsEnabled()) {
    return { enabled: false, ready: false, item: null, personalized: false };
  }

  const popular = await listProducts({
    status: "ACTIVE",
    sort: "popular",
    pageSize: 24,
    inStock: true,
  });

  let pool = popular.items;
  if (userId) {
    const views = await prisma.productView.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { productId: true },
    });
    const viewedIds = new Set(views.map((v) => v.productId));
    const personalized = pool.filter((p) => viewedIds.has(p.id));
    if (personalized.length > 0) {
      pool = personalized;
    }
  }

  const index = daySeed() % Math.max(pool.length, 1);
  const rotated = [...pool.slice(index), ...pool.slice(0, index)];
  const item = await pickDailyFindCard(rotated);

  return {
    enabled: true,
    ready: Boolean(item),
    item,
    personalized: Boolean(userId),
  };
}
