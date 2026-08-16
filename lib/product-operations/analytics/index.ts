import { OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { countTelemetrySince } from "../telemetry";
import type { ProductAnalyticsOverview } from "../types";

export async function getProductAnalyticsOverview(): Promise<ProductAnalyticsOverview> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [dauDevices, mauDevices, sessions24h, crashes24h, orders30d, paidOrders, analyticsEvents] =
    await Promise.all([
      prisma.productTelemetryEvent.findMany({
        where: { createdAt: { gte: dayAgo }, deviceIdHash: { not: null } },
        distinct: ["deviceIdHash"],
        select: { deviceIdHash: true },
      }),
      prisma.productTelemetryEvent.findMany({
        where: { createdAt: { gte: monthAgo }, deviceIdHash: { not: null } },
        distinct: ["deviceIdHash"],
        select: { deviceIdHash: true },
      }),
      countTelemetrySince(24, ["session_start", "screen_view"]),
      countTelemetrySince(24, ["crash", "error"]),
      prisma.order.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: monthAgo },
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.SHIPPED,
              OrderStatus.DELIVERED,
              OrderStatus.COMPLETED,
              OrderStatus.CONFIRMED,
            ],
          },
        },
        select: { total: true },
      }),
      prisma.analyticsEvent.count({ where: { createdAt: { gte: weekAgo } } }),
    ]);

  const gmv30d = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const conversionRate =
    analyticsEvents > 0 ? Math.round((orders30d / analyticsEvents) * 1000) / 10 : 0;

  const returningDevices = await prisma.productTelemetryEvent.groupBy({
    by: ["deviceIdHash"],
    where: { createdAt: { gte: monthAgo }, deviceIdHash: { not: null } },
    _count: { _all: true },
  });
  const retained = returningDevices.filter((d) => d._count._all >= 2).length;
  const retention7d =
    mauDevices.length > 0 ? Math.round((retained / mauDevices.length) * 1000) / 10 : 0;

  const totalSessions = sessions24h || 1;
  const crashFreeRate = Math.round((1 - crashes24h / totalSessions) * 1000) / 10;

  return {
    dau: dauDevices.length,
    mau: mauDevices.length,
    retention7d,
    conversionRate,
    orders30d,
    gmv30d,
    revenue30d: gmv30d,
    sessions24h,
    crashFreeRate: Math.min(100, Math.max(0, crashFreeRate)),
  };
}
