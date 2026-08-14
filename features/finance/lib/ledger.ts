import { prisma } from "@/lib/prisma";

/**
 * Legacy finance hook — delegates to lib/finance (EPIC-FINANCE-001).
 * Kept for callers that still import from features/finance.
 */
export async function recordSaleForPaidOrder(orderId: string): Promise<void> {
  const { syncFinanceOnPaymentInTx } = await import("@/lib/finance");
  await prisma.$transaction(async (tx) => {
    await syncFinanceOnPaymentInTx(tx, orderId);
  });
}

/** When order reaches COMPLETED — delegates to lib/finance release. */
export async function releaseSellerFundsOnOrderCompleted(
  orderId: string,
): Promise<void> {
  const { syncFinanceOnOrderCompleted } = await import("@/lib/finance");
  await syncFinanceOnOrderCompleted(orderId);
}
