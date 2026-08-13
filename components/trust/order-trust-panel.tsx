import {
  BuyerTrustActions,
  OrderTrustTimeline,
} from "@/components/trust";
import { BUYER_PROTECTION_LABELS } from "@/lib/trust-safety";
import {
  buildOrderTrustTimeline,
  canBuyerConfirmReceipt,
  canBuyerOpenDispute,
  getOrderTrustContext,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";

type OrderTrustPanelProps = {
  orderId: string;
};

export async function OrderTrustPanel({ orderId }: OrderTrustPanelProps) {
  if (!isTrustSafetyEnabled()) return null;

  const ctx = await getOrderTrustContext(orderId);
  if (!ctx) return null;

  const steps = buildOrderTrustTimeline({
    orderStatus: ctx.orderStatus,
    protection: ctx.protection,
  });

  const canConfirm = canBuyerConfirmReceipt(ctx.orderStatus);
  const canDispute = canBuyerOpenDispute({
    orderStatus: ctx.orderStatus,
    hasOpenDispute: Boolean(ctx.openDispute),
    isBuyer: true,
  });

  return (
    <section
      className="rounded-2xl border border-border bg-surface/40 p-4 sm:p-5"
      data-testid="order-trust-panel"
    >
      <h2 className="font-heading text-base font-semibold tracking-tight">
        Защита сделки
      </h2>
      {ctx.protection ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {BUYER_PROTECTION_LABELS[ctx.protection]}
        </p>
      ) : null}

      <div className="mt-4">
        <OrderTrustTimeline steps={steps} />
      </div>

      <div className="mt-2">
        <BuyerTrustActions
          orderId={orderId}
          canConfirm={canConfirm}
          canDispute={canDispute}
        />
      </div>
    </section>
  );
}
