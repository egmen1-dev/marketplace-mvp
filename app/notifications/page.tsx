import { redirect } from "next/navigation";

import Link from "next/link";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { getPayoutNotifications, isSellerPayoutEnabled } from "@/lib/seller-payout";
import {
  getSellerLifecycleNotifications,
  isSellerLifecycleEnabled,
} from "@/lib/seller-lifecycle";
import {
  getSellerFirstEntryNotifications,
  isSellerFirstEntryEnabled,
} from "@/lib/seller-first-entry";
import {
  getSellerJourneyNotifications,
  isSellerJourneyEnabled,
} from "@/lib/seller-journey";
import {
  getSellerBusinessNotifications,
  isSellerBusinessIntelligenceEnabled,
} from "@/lib/seller-business-intelligence";
import {
  getSellerOperationsNotifications,
  isSellerOperationsEnabled,
} from "@/lib/seller-operations";
import {
  getTrustExperienceNotifications,
  isMarketplaceTrustExperienceEnabled,
} from "@/lib/marketplace-trust-experience";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Уведомления",
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.NOTIFICATIONS)}`,
    );
  }

  const biEnabled = isSellerBusinessIntelligenceEnabled();
  const operationsEnabled = isSellerOperationsEnabled();
  const journeyEnabled = isSellerJourneyEnabled();

  const notifications = [
    ...(isMarketplaceTrustExperienceEnabled() && user.sellerProfileId
      ? await getTrustExperienceNotifications({ sellerId: user.sellerProfileId })
      : []),
    ...(biEnabled && user.sellerProfileId
      ? await getSellerBusinessNotifications({
          sellerProfileId: user.sellerProfileId,
        })
      : []),
    ...(operationsEnabled && user.sellerProfileId && !biEnabled
      ? await getSellerOperationsNotifications({
          sellerProfileId: user.sellerProfileId,
        })
      : []),
    ...(journeyEnabled && user.sellerProfileId && !operationsEnabled && !biEnabled
      ? await getSellerJourneyNotifications({
          sellerProfileId: user.sellerProfileId,
        })
      : []),
    ...(isSellerFirstEntryEnabled() &&
    user.sellerProfileId &&
    !journeyEnabled &&
    !operationsEnabled &&
    !biEnabled
      ? await getSellerFirstEntryNotifications({
          sellerProfileId: user.sellerProfileId,
        })
      : []),
    ...(isSellerLifecycleEnabled() &&
    user.sellerProfileId &&
    !journeyEnabled &&
    !operationsEnabled &&
    !biEnabled
      ? await getSellerLifecycleNotifications({
          sellerProfileId: user.sellerProfileId,
        })
      : []),
    ...(isSellerPayoutEnabled() && user.sellerProfileId
      ? await getPayoutNotifications({
          sellerProfileId: user.sellerProfileId,
        })
      : []),
  ].slice(0, 12);

  return (
    <AccountShell
      title="Уведомления"
      description="Статусы пути продавца, выплат и другие события кабинета."
    >
      <div className="flex flex-col gap-3" data-testid="notifications-list">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Нет новых уведомлений</p>
        ) : (
          notifications.map((n) => (
            <article
              key={n.id}
              className="rounded-2xl border border-border bg-card p-4"
              data-testid={`notification-${n.type}`}
            >
              <p className="font-medium">{n.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
              {"action" in n && n.action ? (
                <p className="mt-2 text-sm text-foreground">Что сделать: {n.action}</p>
              ) : null}
              {"href" in n && n.href ? (
                <Link
                  href={n.href}
                  className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline"
                >
                  Открыть центр доверия
                </Link>
              ) : null}
            </article>
          ))
        )}
      </div>
    </AccountShell>
  );
}
