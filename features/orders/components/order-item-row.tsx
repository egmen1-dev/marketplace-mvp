import Link from "next/link";

import type { OrderItemView } from "@/features/orders/types";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";

type OrderItemRowProps = {
  item: OrderItemView;
  currency: string;
};

export function OrderItemRow({ item, currency }: OrderItemRowProps) {
  const href = `${ROUTES.PRODUCT}/${item.productId}`;

  return (
    <article className="flex gap-4 border-b border-border/80 py-5 last:border-0">
      <Link
        href={href}
        className="relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24"
      >
        <ProductImage
          src={item.primaryImage?.url}
          alt={item.primaryImage?.alt ?? item.productName}
          sizes="96px"
          containerClassName="absolute inset-0"
          fallbackLabel={false}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <Link
            href={href}
            className="font-heading text-sm font-medium leading-snug transition-colors hover:text-primary sm:text-base"
          >
            {item.productName}
          </Link>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatPrice(item.unitPrice, currency)} × {item.quantity}
          </p>
        </div>
        <p className="font-heading text-sm font-medium sm:text-base">
          {formatPrice(item.totalPrice, currency)}
        </p>
      </div>
    </article>
  );
}
