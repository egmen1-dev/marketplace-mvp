import Link from "next/link";

import { ProductCard } from "@/features/products/components/product-card";
import { ROUTES } from "@/lib/constants";
import type { SocialLandingView } from "@/lib/marketplace-social-growth/types";

type SocialLandingViewProps = {
  view: SocialLandingView;
};

export function SocialLandingSection({ view }: SocialLandingViewProps) {
  const { page, items } = view;

  return (
    <div className="flex flex-col gap-8" data-testid="social-landing-page">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-primary">Находки ЛОТ · Social</p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{page.title}</h1>
        <p className="text-muted-foreground">{page.description}</p>
        <p className="rounded-xl bg-surface/60 p-4 text-sm text-muted-foreground">
          {page.sharePreview}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map(({ product, reasons }) => (
          <div key={product.id} className="flex flex-col gap-2">
            <Link href={`${ROUTES.PRODUCT}/${product.id}`}>
              <ProductCard product={product} />
            </Link>
            {reasons[0] ? (
              <p className="text-xs text-muted-foreground line-clamp-2">✓ {reasons[0]}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
