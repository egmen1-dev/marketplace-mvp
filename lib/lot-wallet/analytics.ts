"use client";

import { trackEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { ROUTES } from "@/lib/constants";
import type { WalletTab } from "@/lib/lot-wallet/types";

export function trackWalletView(tab: WalletTab): void {
  trackEvent({
    event: ANALYTICS_EVENTS.WALLET_VIEW,
    route: `${ROUTES.ACCOUNT_WALLET}?tab=${tab}`,
  });
}

export function trackWalletTopupStarted(): void {
  trackEvent({ event: ANALYTICS_EVENTS.WALLET_TOPUP_STARTED, route: ROUTES.ACCOUNT_WALLET });
}

export function trackPromotionCenterView(): void {
  trackEvent({
    event: ANALYTICS_EVENTS.PROMOTION_CENTER_VIEW,
    route: ROUTES.ACCOUNT_PROMOTION_CENTER,
  });
}

export function trackAccountSettingsView(): void {
  trackEvent({
    event: ANALYTICS_EVENTS.ACCOUNT_SETTINGS_VIEW,
    route: ROUTES.SETTINGS,
  });
}
