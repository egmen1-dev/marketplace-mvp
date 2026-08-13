import { OrderStatus } from "@prisma/client";

import { autoConfirmBuyerOrder } from "@/lib/trust/confirmation";
import { prisma } from "@/lib/prisma";

export type ProtectionCronResult = {
  scanned: number;
  autoConfirmed: number;
  orderIds: string[];
};

/**
 * Cron hook — auto-confirm orders when protection window expires.
 * Wire to POST /api/cron/trust-protection (no scheduler in MVP).
 */
export async function processExpiredProtectionWindows(opts?: {
  now?: Date;
  limit?: number;
}): Promise<ProtectionCronResult> {
  const now = opts?.now ?? new Date();
  const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));

  const candidates = await prisma.order.findMany({
    where: {
      status: OrderStatus.AWAITING_BUYER_CONFIRMATION,
      protectionEndsAt: { lte: now },
    },
    select: { id: true },
    take: limit,
  });

  let autoConfirmed = 0;
  const orderIds: string[] = [];

  for (const order of candidates) {
    const applied = await autoConfirmBuyerOrder(order.id);
    if (applied) {
      autoConfirmed += 1;
      orderIds.push(order.id);
    }
  }

  return {
    scanned: candidates.length,
    autoConfirmed,
    orderIds,
  };
}
