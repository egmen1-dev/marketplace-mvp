import { OrderStatus } from "@prisma/client";

import { isOrderReviewEligible } from "@/features/order-lifecycle/lib/integrations";
import { prisma } from "@/lib/prisma";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { ReviewForm } from "@/features/marketplace-trust-loop";

type OrderReviewSectionProps = {
  orderId: string;
  buyerId: string;
  status: OrderStatus;
  reviewEligibleAt: string | Date | null;
  items: { productId: string; productName: string }[];
};

export async function OrderReviewSection(props: OrderReviewSectionProps) {
  if (!isMarketplaceTrustLoopEnabled()) return null;
  const reviewEligibleAt =
    props.reviewEligibleAt == null
      ? null
      : props.reviewEligibleAt instanceof Date
        ? props.reviewEligibleAt
        : new Date(props.reviewEligibleAt);

  if (
    !isOrderReviewEligible({
      status: props.status,
      reviewEligibleAt,
    })
  ) {
    return null;
  }

  const firstItem = props.items[0];
  if (!firstItem) return null;

  const existing = await prisma.review.findFirst({
    where: { orderId: props.orderId, buyerId: props.buyerId },
  });
  if (existing) {
    return (
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Спасибо! Ваш отзыв {existing.status === "APPROVED" ? "опубликован" : "на модерации"}.
      </p>
    );
  }

  return (
    <ReviewForm
      orderId={props.orderId}
      productId={firstItem.productId}
      productName={firstItem.productName}
    />
  );
}
