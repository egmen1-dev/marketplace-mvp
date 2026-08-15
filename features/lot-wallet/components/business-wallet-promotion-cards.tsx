import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import type { WalletBuckets } from "@/lib/lot-wallet/types";
import type { PromotionCenterDashboard } from "@/lib/seller-promotion-center";

function formatRub(value: number): string {
  return `${Math.round(value).toLocaleString("ru-RU")} ₽`;
}

function campaignLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} кампания`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} кампании`;
  }
  return `${count} кампаний`;
}

type BusinessWalletPromotionCardsProps = {
  walletEnabled: boolean;
  promotionEnabled: boolean;
  buckets: WalletBuckets | null;
  promotion: Pick<
    PromotionCenterDashboard,
    "activeCampaigns" | "spent30d"
  > | null;
};

export function BusinessWalletPromotionCards({
  walletEnabled,
  promotionEnabled,
  buckets,
  promotion,
}: BusinessWalletPromotionCardsProps) {
  if (!walletEnabled && !promotionEnabled) return null;

  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      data-testid="business-wallet-promotion-cards"
    >
      {walletEnabled && buckets ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Деньги</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Доступно</dt>
              <dd className="font-medium">{formatRub(buckets.withdrawableAmount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Ожидается</dt>
              <dd className="font-medium">{formatRub(buckets.pendingFromSales)}</dd>
            </div>
          </dl>
          <Button
            className="mt-4 min-h-12 w-full sm:w-auto"
            nativeButton={false}
            render={<Link href={ROUTES.ACCOUNT_WALLET} />}
          >
            Кошелёк
          </Button>
        </section>
      ) : null}

      {promotionEnabled && promotion ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-semibold">Продвижение</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Активно</dt>
              <dd className="font-medium">{campaignLabel(promotion.activeCampaigns)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">Расход</dt>
              <dd className="font-medium">{formatRub(promotion.spent30d)}</dd>
            </div>
          </dl>
          <Button
            className="mt-4 min-h-12 w-full sm:w-auto"
            nativeButton={false}
            render={<Link href={ROUTES.ACCOUNT_PROMOTION_CENTER} />}
          >
            Управлять
          </Button>
        </section>
      ) : null}
    </div>
  );
}
