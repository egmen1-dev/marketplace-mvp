import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth";
import { AccountReviews } from "@/features/reviews/components";
import {
  listBuyerReviewables,
  listBuyerReviews,
  listSellerReviews,
} from "@/features/reviews/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Отзывы" };

export default async function AccountReviewsPage() {
  const session = await getSessionUser();
  if (!session) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_REVIEWS)}`,
    );
  }

  const [awaiting, myReviews, sellerReviews] = await Promise.all([
    listBuyerReviewables(session.id),
    listBuyerReviews(session.id),
    session.sellerProfileId
      ? listSellerReviews(session.sellerProfileId)
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Отзывы</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Оставляйте отзывы на купленные товары и отвечайте на отзывы о своих товарах.
        </p>
      </div>

      <AccountReviews
        awaiting={awaiting.map((a) => ({
          orderItemId: a.orderItemId,
          orderNumber: a.orderNumber,
          productId: a.productId,
          productName: a.productName,
          productSlug: a.productSlug,
          completedAt: a.completedAt.toISOString(),
        }))}
        myReviews={myReviews}
        sellerReviews={sellerReviews}
      />
    </div>
  );
}
