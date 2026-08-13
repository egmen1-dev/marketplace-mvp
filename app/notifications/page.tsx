import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { getPayoutNotifications, isSellerPayoutEnabled } from "@/lib/seller-payout";
import {
  getSellerLifecycleNotifications,
  isSellerLifecycleEnabled,
} from "@/lib/seller-lifecycle";

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

  const notifications = [
    ...(isSellerLifecycleEnabled() && user.sellerProfileId
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
            </article>
          ))
        )}
      </div>
    </AccountShell>
  );
}
