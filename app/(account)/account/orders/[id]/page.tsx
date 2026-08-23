import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";

import { getSessionUser } from "@/features/auth";
import { BuyerDeliveryProgress } from "@/features/marketplace-delivery";
import { OrderReviewSection } from "@/features/marketplace-trust-loop/components/order-review-section";
import { getOrderForUser, OrderDetailView } from "@/features/orders";
import { MobileCheckoutReturn } from "@/features/orders/components/mobile-checkout-return";
import {
  getBuyerDeliveryProgress,
  isMarketplaceDeliveryEnabled,
} from "@/lib/marketplace-delivery";
import { MOBILE_RETURN_COOKIE } from "@/lib/mobile/checkout-return-cookie";
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

  const cookieStore = await cookies();
  const mobileReturnCookie = cookieStore.get(MOBILE_RETURN_COOKIE)?.value;
  const showMobileReturn = Boolean(mobileReturnCookie);

  return (
    <div className="flex flex-col gap-6">
      {showMobileReturn ? (
        <MobileCheckoutReturn
          orderId={order.id}
          orderNumber={order.orderNumber}
          autoOpen={payment === "success"}
        />
      ) : null}
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
