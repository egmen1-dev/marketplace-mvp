"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import { purchasePromotionAction } from "@/lib/seller-promotion-center/actions";
import { PROMOTION_PLANS } from "@/lib/seller-promotion-center/plans";
import type { PromotionCenterDashboard } from "@/lib/seller-promotion-center/queries";
import { trackPromotionCenterView } from "@/lib/lot-wallet/analytics";
import { ROUTES } from "@/lib/constants";
import type { WalletBuckets } from "@/lib/lot-wallet/types";

type PromotionCenterPanelProps = {
  dashboard: PromotionCenterDashboard;
  walletBuckets: WalletBuckets;
};

export function PromotionCenterPanel({
  dashboard,
  walletBuckets,
}: PromotionCenterPanelProps) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    trackPromotionCenterView();
  }, []);

  function buyPromotion(productId: string, planId: "STARTER" | "GROWTH" | "PRO") {
    const plan = PROMOTION_PLANS.find((p) => p.id === planId);
    if (!plan) return;
    if (walletBuckets.spendableAmount < plan.price) {
      toast.error(
        `Недостаточно средств. Не хватает ${formatPrice(plan.price - walletBuckets.spendableAmount)}`,
      );
      return;
    }
    startTransition(() => {
      void (async () => {
        const result = await purchasePromotionAction({
          productId,
          planId,
          paymentMethod: "wallet",
        });
        if (!result.ok) {
          toast.error(result.error ?? "Не удалось оплатить");
          return;
        }
        toast.success("Продвижение оплачено из кошелька");
      })();
    });
  }

  if (!dashboard.enabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Центр продвижения временно недоступен.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="promotion-center-panel">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-heading text-lg font-semibold">
          Продвигайте товары и отслеживайте результат
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Активных кампаний</p>
            <p className="font-heading text-2xl font-semibold">{dashboard.activeCampaigns}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Потрачено за 30 дней</p>
            <p className="font-heading text-2xl font-semibold">
              {formatPrice(dashboard.spent30d)}
            </p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Заказов</p>
            <p className="font-heading text-2xl font-semibold">{dashboard.orders30d}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Выручка</p>
            <p className="font-heading text-2xl font-semibold">
              {formatPrice(dashboard.revenue30d)}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Баланс кошелька: {formatPrice(walletBuckets.spendableAmount)}{" "}
          <Link href={ROUTES.ACCOUNT_WALLET} className="text-primary hover:underline">
            Пополнить
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="font-heading text-base font-semibold">Ваши товары</h3>
        {dashboard.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Добавьте товар, чтобы начать продвижение.</p>
        ) : (
          dashboard.products.map((product) => (
            <article
              key={product.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row"
            >
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                {product.imageUrl ? (
                  <ProductImage src={product.imageUrl} alt={product.name} fill sizes="80px" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.name}</p>
                {product.ready ? (
                  <>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Карточка готова к продвижению
                    </p>
                    <ul className="mt-2 text-xs text-muted-foreground">
                      <li>✓ фото заполнены</li>
                      <li>✓ товар в наличии</li>
                      <li>✓ карточка заполнена</li>
                    </ul>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {PROMOTION_PLANS.map((plan) => (
                        <Button
                          key={plan.id}
                          size="sm"
                          variant="outline"
                          onClick={() => buyPromotion(product.id, plan.id)}
                        >
                          {plan.name} · {formatPrice(plan.price)}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                      Сначала исправьте карточку
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Не хватает: {product.missing.map((m) => `• ${m}`).join(" ")}
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      nativeButton={false}
                      render={
                        <Link href={`${ROUTES.ACCOUNT_PRODUCTS}/${product.id}/edit`} />
                      }
                    >
                      Исправить
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
