import Link from "next/link";

import { ROUTES } from "@/lib/constants";
import type { BuyerHomeContext } from "@/lib/marketplace-ux-completion/types";

type BuyerHomeHeaderProps = {
  context: BuyerHomeContext;
};

export function BuyerHomeHeader({ context }: BuyerHomeHeaderProps) {
  if (!context.enabled) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6" data-testid="buyer-home-header">
      <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {context.greeting}
      </h2>
      {context.favoritesCount > 0 || context.ordersCount > 0 ? (
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {context.favoritesCount > 0 ? (
            <Link href={ROUTES.FAVORITES} className="hover:text-primary">
              ❤️ {context.favoritesCount} в избранном
            </Link>
          ) : null}
          {context.ordersCount > 0 ? (
            <Link href={ROUTES.ORDERS} className="hover:text-primary">
              🛒 {context.ordersCount} заказ(ов)
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
