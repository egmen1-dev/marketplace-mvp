import Link from "next/link";

import { SellerShipQueuePanel } from "@/features/marketplace-delivery";
import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import {
  isMarketplaceDeliveryEnabled,
  listSellerShipQueue,
} from "@/lib/marketplace-delivery";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Нужно отправить" };

export default async function SellerOrdersShipPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_ORDERS_SHIP);
  const enabled = isMarketplaceDeliveryEnabled();
  const queue = enabled ? await listSellerShipQueue(seller.sellerProfileId) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={ROUTES.ACCOUNT_SALES}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Все заказы
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Нужно отправить
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Оплаченные заказы с доставкой — создайте отправление и передайте в СДЭК
        </p>
      </div>
      {!enabled ? (
        <p className="text-sm text-muted-foreground">
          MARKETPLACE_DELIVERY_ENABLED=false
        </p>
      ) : (
        <SellerShipQueuePanel items={queue} />
      )}
    </div>
  );
}
