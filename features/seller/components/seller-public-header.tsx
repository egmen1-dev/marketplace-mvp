import Image from "next/image";
import Link from "next/link";
import { Store } from "lucide-react";

import { SellerBadges } from "@/features/seller/components/seller-badge";
import {
  formatSellerJoinedDate,
  formatSellerKindLabel,
  getVisibleSellerMetrics,
  type SellerTrustProfile,
} from "@/features/seller/lib/reputation";
import { cn } from "@/lib/utils";

type SellerPublicHeaderProps = {
  profile: SellerTrustProfile;
  className?: string;
};

export function SellerPublicHeader({
  profile,
  className,
}: SellerPublicHeaderProps) {
  const metrics = getVisibleSellerMetrics(profile.metrics);
  const joinedLabel = formatSellerJoinedDate(profile.joinedAt);

  return (
    <header
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-border bg-card/50 p-5 sm:flex-row sm:items-start sm:p-6",
        className,
      )}
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-elevated">
        {profile.logoUrl ? (
          <Image
            src={profile.logoUrl}
            alt={profile.storeName}
            fill
            className="object-cover"
            sizes="96px"
            priority
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/25 via-muted to-surface">
            <Store className="size-10 text-primary" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {profile.storeName}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {formatSellerKindLabel(profile.kind)}
        </p>

        <SellerBadges
          isVerified={profile.isVerified}
          kind={profile.kind}
          joinedAt={profile.joinedAt}
          className="mt-3"
        />

        {profile.description ? (
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {profile.description}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {metrics.map((item) => (
            <div key={item.key}>
              <span className="text-muted-foreground">{item.label} </span>
              <span className="font-medium tabular-nums text-foreground">
                {item.value}
              </span>
            </div>
          ))}
          <div className="text-muted-foreground">
            На площадке с{" "}
            <span className="text-foreground">{joinedLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

/** Compact seller name for product cards — no fake metrics. */
export function ProductCardSellerLink({
  storeName,
  slug,
  className,
}: {
  storeName: string;
  slug: string;
  className?: string;
}) {
  return (
    <Link
      href={`/seller/${slug}`}
      className={cn(
        "line-clamp-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-primary",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {storeName}
    </Link>
  );
}
