import Link from "next/link";

import { discoveryCollectionPath } from "@/lib/constants";
import type { DiscoveryCollection } from "@/lib/marketplace-discovery/types";

type DiscoveryCollectionsGridProps = {
  collections: DiscoveryCollection[];
};

export function DiscoveryCollectionsGrid({
  collections,
}: DiscoveryCollectionsGridProps) {
  return (
    <section className="flex flex-col gap-4" data-testid="discovery-collections-grid">
      <div>
        <h3 className="font-heading text-xl font-semibold">Подборки Находок</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          SEO-страницы для вдохновения и покупок
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((collection) => (
          <Link
            key={collection.slug}
            href={discoveryCollectionPath(collection.slug)}
            className="rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <p className="font-medium">{collection.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {collection.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
