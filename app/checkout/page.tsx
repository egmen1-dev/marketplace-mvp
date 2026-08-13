import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CheckoutTrustNote, SafeDealBlock } from "@/components/trust";
import { FunnelTracker } from "@/components/analytics";
import { getSessionUser } from "@/features/auth";
import { getCartForUser } from "@/features/cart";
import { CheckoutForm } from "@/features/orders";
import type { CheckoutPickupOption } from "@/features/orders/components/checkout-form";
import { calcPrepaymentAmount } from "@/features/pickup/lib/prepayment";
import { ROUTES } from "@/lib/constants";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { prisma } from "@/lib/prisma";
import { toPriceNumber } from "@/features/products/mappers";
import { isTrustSafetyEnabled } from "@/lib/trust-safety";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Оформление заказа",
};

type CheckoutPageProps = {
  searchParams: Promise<{ canceled?: string; fulfillment?: string }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const { canceled, fulfillment } = await searchParams;
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.CHECKOUT)}`,
    );
  }

  const [cart, profile] = await Promise.all([
    getCartForUser(user.id),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true, name: true },
    }),
  ]);

  let sellerPickupAvailable = false;
  const sellerPickupOptions: CheckoutPickupOption[] = [];

  if (cart.items.length > 0) {
    const productIds = cart.items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        sellerId: true,
        price: true,
        pickupEnabled: true,
        reservationEnabled: true,
        prepaymentPercent: true,
        pickupPoints: {
          where: { pickupPoint: { isActive: true } },
          select: {
            pickupPointId: true,
            pickupPoint: true,
          },
        },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));
    const sellerIds = new Set(
      cart.items.map((i) => byId.get(i.productId)?.sellerId).filter(Boolean),
    );
    const allPickup = cart.items.every((i) => {
      const p = byId.get(i.productId);
      return p?.pickupEnabled && (p.pickupPoints.length ?? 0) > 0;
    });

    if (sellerIds.size === 1 && allPickup) {
      sellerPickupAvailable = true;
      const intersection = products.reduce<Set<string> | null>((acc, p) => {
        const ids = new Set(p.pickupPoints.map((x) => x.pickupPointId));
        if (!acc) return ids;
        return new Set([...acc].filter((id) => ids.has(id)));
      }, null);

      const pointMap = new Map(
        products.flatMap((p) =>
          p.pickupPoints.map((l) => [l.pickupPointId, l.pickupPoint] as const),
        ),
      );

      for (const pointId of intersection ?? []) {
        const point = pointMap.get(pointId);
        if (!point) continue;
        let prepaymentTotal = 0;
        let remainingTotal = 0;
        for (const item of cart.items) {
          const p = byId.get(item.productId)!;
          const line = toPriceNumber(p.price) * item.quantity;
          const pct = p.reservationEnabled ? p.prepaymentPercent : 100;
          const { prepayment, remaining } = calcPrepaymentAmount(line, pct);
          prepaymentTotal += prepayment;
          remainingTotal += remaining;
        }
        sellerPickupOptions.push({
          point: {
            id: point.id,
            sellerId: point.sellerId,
            name: point.name,
            city: point.city,
            address: point.address,
            description: point.description,
            phone: point.phone,
            workingHours: point.workingHours,
            isActive: point.isActive,
            createdAt: point.createdAt.toISOString(),
            updatedAt: point.updatedAt.toISOString(),
          },
          prepaymentTotal: Math.round(prepaymentTotal * 100) / 100,
          remainingTotal: Math.round(remainingTotal * 100) / 100,
        });
      }
      if (sellerPickupOptions.length === 0) {
        sellerPickupAvailable = false;
      }
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Оформление заказа
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Выберите доставку или самовывоз у продавца.
          </p>
        </div>
        {cart.items.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={ROUTES.CART} />}
          >
            Изменить корзину
          </Button>
        ) : null}
      </div>

      <FunnelTracker
        event={ANALYTICS_EVENTS.CHECKOUT_START}
        route={ROUTES.CHECKOUT}
      />
      <CheckoutTrustNote />
      {isTrustSafetyEnabled() ? <SafeDealBlock /> : null}
      <CheckoutForm
        initialCart={cart}
        defaultName={profile?.name ?? user.name ?? ""}
        defaultPhone={profile?.phone ?? ""}
        canceled={canceled === "1"}
        sellerPickupAvailable={sellerPickupAvailable}
        sellerPickupOptions={sellerPickupOptions}
        preferSellerPickup={
          fulfillment === "SELLER_PICKUP" || fulfillment === "pickup"
        }
      />
    </div>
  );
}
