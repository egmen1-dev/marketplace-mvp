import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SellerBadges } from "@/features/seller/components/seller-badge";
import {
  formatSellerJoinedDate,
  formatSellerKindLabel,
  getVisibleSellerMetrics,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
import { ReviewStars } from "@/features/reviews/components";
import { pluralizeRatingWord } from "@/lib/i18n";
import { sellerPublicPath } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ProductSellerCardProps = {
  seller: SellerTrustProfile;
  /** Real seller review aggregate; rating shown only when count > 0. */
  rating?: { avgRating: number; reviewCount: number };
  className?: string;
};

export function ProductSellerCard({ seller, rating, className }: ProductSellerCardProps) {
  const metrics = getVisibleSellerMetrics(seller.metrics);
  const joinedLabel = formatSellerJoinedDate(seller.joinedAt);
  const hasRating = Boolean(rating && rating.reviewCount > 0);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface/70 p-4 sm:p-5",
        className,
      )}
      data-testid="pdp-seller"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-elevated sm:size-[72px]">
          {seller.logoUrl ? (
            <Image
              src={seller.logoUrl}
              alt={seller.storeName}
              fill
              className="object-cover"
              sizes="72px"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-surface">
              <Store className="size-7 text-primary" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Продавец
          </p>
          <h3 className="mt-0.5 font-heading text-lg font-semibold tracking-tight sm:text-xl">
            <Link
              href={sellerPublicPath(seller.slug)}
              className="underline-offset-4 hover:underline"
            >
              {seller.storeName}
            </Link>
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {formatSellerKindLabel(seller.kind)}
          </p>

          {hasRating && rating ? (
            <div
              className="mt-1.5 flex items-center gap-1.5"
              data-testid="pdp-seller-rating"
            >
              <ReviewStars value={rating.avgRating} size={14} />
              <span className="text-sm font-medium text-foreground">
                {rating.avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-muted-foreground">
                {rating.reviewCount} {pluralizeRatingWord(rating.reviewCount)}
              </span>
            </div>
          ) : null}

          <SellerBadges
            isVerified={seller.isVerified}
            kind={seller.kind}
            joinedAt={seller.joinedAt}
            className="mt-2.5"
          />

          {(metrics.length > 0 || seller.joinedAt) && (
            <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {metrics.map((item) => (
                <div key={item.key}>
                  <dt className="sr-only">{item.label}</dt>
                  <dd>
                    {item.label}{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {item.value}
                    </span>
                  </dd>
                </div>
              ))}
              <div>
                <dt className="sr-only">Дата регистрации</dt>
                <dd>На площадке с {joinedLabel}</dd>
              </div>
            </dl>
          )}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-4 w-full sm:w-auto"
        nativeButton={false}
        render={<Link href={sellerPublicPath(seller.slug)} />}
      >
        Все товары продавца
      </Button>
    </div>
  );
}
