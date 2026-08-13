import Link from "next/link";

import { HomeProductGrid } from "@/components/home/home-product-grid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProductCard } from "@/features/products";
import type { ProductListItem } from "@/features/products/types";
import { ROUTES } from "@/lib/constants";

type HomeProductSectionProps = {
  title: string;
  description: string;
  products: ProductListItem[];
  section: "popular" | "new";
  catalogHref?: string;
};

export function HomeProductSection({
  title,
  description,
  products,
  section,
  catalogHref = ROUTES.CATALOG,
}: HomeProductSectionProps) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="home-section-title font-heading font-semibold tracking-tight">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-fit rounded-xl border-border"
            nativeButton={false}
            render={<Link href={catalogHref} />}
          >
            Смотреть всё
          </Button>
        </div>

        {products.length === 0 ? (
          <Card className="border-border bg-card/80">
            <CardHeader>
              <CardTitle>Пока нет товаров</CardTitle>
              <CardDescription>
                Загляните в{" "}
                <Link
                  href={ROUTES.CATALOG}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  каталог
                </Link>{" "}
                — новые предложения появляются каждый день.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <HomeProductGrid section={section}>
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                imagePriority={section === "popular" && index < 4}
                style={{ animationDelay: `${80 + index * 50}ms` }}
              />
            ))}
          </HomeProductGrid>
        )}
      </div>
    </section>
  );
}
