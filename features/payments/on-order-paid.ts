import { recordSaleForPaidOrder } from "@/features/finance/lib/ledger";
import { log } from "@/lib/logger";

/**
 * Finance integration after order is marked paid (post-OMS).
 * Creates FinanceTransaction SALE + credits SellerBalance.pending.
 */
export async function onOrderPaidForFinance(orderId: string): Promise<void> {
  try {
    await recordSaleForPaidOrder(orderId);
  } catch (err) {
    log.error("finance_order_paid_hook_failed", {
      orderId,
      message: err instanceof Error ? err.message : "unknown",
    });
  }
}
