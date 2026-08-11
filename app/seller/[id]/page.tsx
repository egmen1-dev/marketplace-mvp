import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SellerProductsSection } from "@/features/seller/components/seller-products-section";
import { SellerPublicHeader } from "@/features/seller/components/seller-public-header";
import { getPublicSellerPageData } from "@/features/seller/queries";
import {
  getSellerReviewSummary,
  listSellerReviews,
} from "@/features/reviews/queries";
import { ReviewCard, ReviewStars } from "@/features/reviews/components";
import { pluralizeRatingWord } from "@/lib/i18n";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicSellerPageData(id);
  if (!data) return { title: "Продавец" };
  return {
    title: `${data.trust.storeName} · ${APP_NAME}`,
    description: data.trust.description ?? undefined,
  };
}

export default async function PublicSellerPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getPublicSellerPageData(id);
  if (!data) notFound();

  const { trust, products } = data;

  const [reviewSummary, sellerReviews] = await Promise.all([
    getSellerReviewSummary(trust.id),
    listSellerReviews(trust.id),
  ]);
  const recentReviews = sellerReviews.slice(0, 6);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <SellerPublicHeader profile={trust} />

      <section className="flex flex-col gap-4" data-testid="seller-reviews">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-xl font-semibold">Отзывы покупателей</h2>
          {reviewSummary.reviewCount > 0 ? (
            <span
              className="flex items-center gap-1.5 text-sm"
              data-testid="seller-public-rating"
            >
              <ReviewStars value={reviewSummary.avgRating} size={14} />
              <span className="font-medium">{reviewSummary.avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                · {reviewSummary.reviewCount} {pluralizeRatingWord(reviewSummary.reviewCount)}
              </span>
            </span>
          ) : null}
        </div>
        {recentReviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Пока нет оценок</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentReviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
      </section>

      <SellerProductsSection products={products} />
    </div>
  );
}
