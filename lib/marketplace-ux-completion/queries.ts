import { ROUTES } from "@/lib/constants";
import { isMarketplaceDeliveryEnabled } from "@/lib/marketplace-delivery/flags";
import { isMarketplaceTrustLoopEnabled } from "@/lib/marketplace-trust-loop/flags";
import { isMarketplaceDiscoveryEnabled } from "@/lib/marketplace-discovery/flags";

import { buildAccountOverview } from "./account-overview";
import { getBuyerHomeContext } from "./buyer-home";
import { buildSettingsView } from "./settings";
import { getSellerHomeSummary } from "./seller-home";
import { buildPdpFitUx, buildPdpTrustUx } from "./trust-ui";
import { isMarketplaceUxCompletionEnabled } from "./flags";
import type { AdminUxOverview } from "./types";

export {
  buildAccountOverview,
  getBuyerHomeContext,
  buildSettingsView,
  getSellerHomeSummary,
  buildPdpTrustUx,
  buildPdpFitUx,
};

export async function getAdminUxOverview(): Promise<AdminUxOverview> {
  if (!isMarketplaceUxCompletionEnabled()) {
    return { enabled: false, healthBlocks: [], attention: [], aiTips: [] };
  }

  return {
    enabled: true,
    healthBlocks: [
      {
        label: "Продажи",
        href: ROUTES.ADMIN_ORDERS,
        status: "Мониторинг заказов",
      },
      {
        label: "Платежи",
        href: ROUTES.ADMIN_PAYMENTS,
        status: "Проверка платежей",
      },
      {
        label: "Доставка",
        href: ROUTES.ADMIN_DELIVERY,
        status: isMarketplaceDeliveryEnabled() ? "Активна" : "Выключена",
      },
      {
        label: "Доверие",
        href: ROUTES.ADMIN_TRUST,
        status: isMarketplaceTrustLoopEnabled() ? "Trust Loop ON" : "Выключен",
      },
      {
        label: "Discovery",
        href: ROUTES.ADMIN_DISCOVERY,
        status: isMarketplaceDiscoveryEnabled() ? "Активен" : "Выключен",
      },
    ],
    attention: [
      "Проверьте заказы с просроченной доставкой",
      "Следите за модерацией новых товаров",
    ],
    aiTips: [
      "Discovery + Social Growth усиливают органический трафик",
      "Пустые состояния ведут пользователя к следующему шагу",
    ],
  };
}
