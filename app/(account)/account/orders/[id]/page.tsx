import { notFound, redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth";
import { BuyerDeliveryProgress } from "@/features/marketplace-delivery";
import { OrderReviewSection } from "@/features/marketplace-trust-loop/components/order-review-section";
import { getOrderForUser, OrderDetailView } from "@/features/orders";
import {
  getBuyerDeliveryProgress,
  isMarketplaceDeliveryEnabled,
} from "@/lib/marketplace-delivery";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type OrderPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
};

export const metadata = {
  title: "Заказ",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: OrderPageProps) {
  const { id } = await params;
  const { payment } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.ORDERS}/${id}`)}`,
    );
  }

  const order = await getOrderForUser(user.id, id);
  if (!order) {
    notFound();
  }

  const deliveryProgress =
    isMarketplaceDeliveryEnabled() && order.fulfillmentType === "DELIVERY"
      ? await getBuyerDeliveryProgress(order.id, user.id)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <OrderDetailView
        order={order}
        paymentSuccess={payment === "success"}
      />
      {deliveryProgress ? (
        <BuyerDeliveryProgress
          orderId={order.id}
          steps={deliveryProgress.steps}
          trackingNumber={deliveryProgress.trackingNumber}
          trackingUrl={deliveryProgress.trackingUrl}
        />
      ) : null}
      <OrderReviewSection
        orderId={order.id}
        buyerId={user.id}
        status={order.status}
        reviewEligibleAt={order.reviewEligibleAt ?? null}
        items={order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
        }))}
      />
    </div>
  );
}
