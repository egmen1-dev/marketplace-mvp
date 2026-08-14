import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SellerReputationLink } from "@/features/marketplace-trust-conversion/components/seller-reputation-link";
import { TrustTierBadge } from "@/features/marketplace-new-seller-trust";
import { SellerBadges } from "@/features/seller/components/seller-badge";
import type { TrustTier } from "@/lib/marketplace-new-seller-trust/types";
import {
  formatSellerJoinedDate,
  formatSellerKindLabel,
  getVisibleSellerMetrics,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
import { sellerPublicPath } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ProductSellerCardProps = {
  seller: SellerTrustProfile;
  trustTier?: TrustTier | null;
  className?: string;
};

export function ProductSellerCard({ seller, trustTier, className }: ProductSellerCardProps) {
  const metrics = getVisibleSellerMetrics(seller.metrics);
  const joinedLabel = formatSellerJoinedDate(seller.joinedAt);

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
            <SellerReputationLink
              href={sellerPublicPath(seller.slug)}
              sellerId={seller.id}
              className="underline-offset-4 hover:underline"
            >
              {seller.storeName}
            </SellerReputationLink>
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            {formatSellerKindLabel(seller.kind)}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <SellerBadges
              isVerified={seller.isVerified}
              kind={seller.kind}
              joinedAt={seller.joinedAt}
              completedOrdersCount={seller.metrics.completedOrdersCount}
            />
            {trustTier ? <TrustTierBadge tier={trustTier} /> : null}
          </div>

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
