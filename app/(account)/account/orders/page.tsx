import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { listOrdersForUser, OrdersList } from "@/features/orders";
import { ROUTES } from "@/lib/constants";
import {
  getOrdersEmptyState,
  isMarketplaceUxCompletionEnabled,
} from "@/lib/marketplace-ux-completion";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Заказы",
};

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ORDERS)}`,
    );
  }

  let orders: Awaited<ReturnType<typeof listOrdersForUser>> = [];
  let dbError: string | null = null;

  try {
    orders = await listOrdersForUser(user.id);
  } catch (err) {
    console.error("[orders page]", err);
    dbError = "Не удалось загрузить заказы";
  }

  return (
    <AccountShell
      title="Мои заказы"
      description="История покупок и статусы доставки."
    >
      {dbError ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dbError}
        </p>
      ) : (
        <OrdersList
          orders={orders}
          uxEmptyState={
            isMarketplaceUxCompletionEnabled() ? getOrdersEmptyState() : null
          }
        />
      )}
    </AccountShell>
  );
}
