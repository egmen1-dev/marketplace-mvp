import Link from "next/link";

import { enforceSellerFirstEntry } from "@/lib/seller-first-entry/server";
import { SellerFirstEntryBannerSlot } from "@/features/seller-first-entry";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Продвижение",
};

/** Placeholder until Promotion Center epic merges — keeps nav and coach CTAs working. */
export default async function AccountPromotionCenterPage() {
  const seller = await enforceSellerFirstEntry(ROUTES.ACCOUNT_PROMOTION_CENTER);

  return (
    <div className="flex flex-col gap-6">
      <SellerFirstEntryBannerSlot sellerProfileId={seller.sellerProfileId} />
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Продвижение
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Продвижение помогает показать товар большему количеству покупателей.
          Результат не гарантируется.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Центр продвижения скоро будет доступен. Пока используйте AI помощник
          для рекомендаций по росту продаж.
        </p>
        <Link
          href={ROUTES.ACCOUNT_COMMAND_CENTER}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Открыть AI помощник
        </Link>
      </div>
    </div>
  );
}
