"use client";

import Link from "next/link";

import { ProductCard } from "@/features/products/components/product-card";
import { ShareFindButton } from "@/features/marketplace-social-growth";
import { ROUTES } from "@/lib/constants";
import { trackDiscoveryProductClick, trackDiscoverySectionView } from "@/lib/marketplace-discovery/analytics";
import { isSocialShareCardsEnabled } from "@/lib/marketplace-social-growth/flags";
import type { DiscoveryFeedSection } from "@/lib/marketplace-discovery/types";
import { useEffect } from "react";

type DiscoveryFeedSectionViewProps = {
  section: DiscoveryFeedSection;
};

export function DiscoveryFeedSectionView({ section }: DiscoveryFeedSectionViewProps) {
  useEffect(() => {
    trackDiscoverySectionView(section.id);
  }, [section.id]);

  return (
    <section className="flex flex-col gap-4" data-testid={`discovery-section-${section.id}`}>
      <div>
        <h3 className="font-heading text-xl font-semibold">
          {section.emoji} {section.title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {section.items.map(({ product, reasons }) => (
          <div key={product.id} className="flex flex-col gap-2">
            <div onClick={() => trackDiscoveryProductClick(product.id)}>
              <ProductCard product={product} />
            </div>
            {reasons[0] ? (
              <p className="text-xs text-muted-foreground line-clamp-2">✓ {reasons[0].label}</p>
            ) : null}
            {isSocialShareCardsEnabled() ? (
              <ShareFindButton productId={product.id} label="Поделиться" />
            ) : null}
          </div>
        ))}
      </div>
      {section.href ? (
        <Link href={section.href} className="text-sm text-primary hover:underline">
          Смотреть подборку →
        </Link>
      ) : null}
    </section>
  );
}
