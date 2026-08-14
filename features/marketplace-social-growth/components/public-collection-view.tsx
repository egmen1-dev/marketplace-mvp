import Link from "next/link";

import { ProductCard } from "@/features/products/components/product-card";
import { ROUTES } from "@/lib/constants";
import type { CreatorCollectionView } from "@/lib/marketplace-social-growth/types";

type PublicCollectionViewProps = {
  collection: CreatorCollectionView;
};

export function PublicCollectionView({ collection }: PublicCollectionViewProps) {
  return (
    <div className="flex flex-col gap-8" data-testid="public-social-collection">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-primary">
          {collection.creatorName} собрал:
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          «{collection.title}»
        </h1>
        {collection.description ? (
          <p className="text-muted-foreground">{collection.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {collection.items.length} товаров · {collection.views} просмотров
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {collection.items.map(({ product }) => (
          <Link key={product.id} href={`${ROUTES.PRODUCT}/${product.id}`}>
            <ProductCard product={product} />
          </Link>
        ))}
      </div>
    </div>
  );
}
