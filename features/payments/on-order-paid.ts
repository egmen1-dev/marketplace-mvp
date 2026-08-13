import { log } from "@/lib/logger";

/**
 * Finance / ledger integration hook — called after order is marked PAID.
 * No payout logic in MVP; reserved for future Transaction records.
 */
export async function onOrderPaidForFinance(orderId: string): Promise<void> {
  log.info("finance_order_paid_hook", {
    orderId,
    detail: "Future: Transaction creation, seller balance, payout schedule",
  });
}
