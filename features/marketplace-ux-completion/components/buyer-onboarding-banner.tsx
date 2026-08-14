"use client";

import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  completeBuyerOnboardingAction,
  openBuyerDiscoveryAction,
  startBuyerOnboardingAction,
} from "@/lib/marketplace-ux-completion/actions";
import { useEffect, useState } from "react";

type BuyerOnboardingBannerProps = {
  show: boolean;
};

export function BuyerOnboardingBanner({ show }: BuyerOnboardingBannerProps) {
  const [visible, setVisible] = useState(show);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (show) startBuyerOnboardingAction();
  }, [show]);

  if (!visible) return null;

  function finish(startShopping: boolean) {
    startTransition(async () => {
      await completeBuyerOnboardingAction();
      if (startShopping) await openBuyerDiscoveryAction();
      setVisible(false);
    });
  }

  return (
    <div
      className="rounded-2xl border border-primary/30 bg-primary/10 p-6"
      data-testid="buyer-onboarding-banner"
    >
      <h2 className="font-heading text-xl font-semibold">Добро пожаловать в ЛОТ 👋</h2>
      <p className="mt-2 text-sm text-muted-foreground">Здесь вы можете:</p>
      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
        <li>✓ находить необычные товары</li>
        <li>✓ сохранять находки</li>
        <li>✓ покупать безопасно</li>
        <li>✓ получать персональные рекомендации</li>
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => finish(true)}>
          Начать покупки
        </Button>
        <Button type="button" variant="outline" onClick={() => finish(false)}>
          Понятно
        </Button>
      </div>
    </div>
  );
}
