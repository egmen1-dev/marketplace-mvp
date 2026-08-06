import { redirect } from "next/navigation";

import { getSessionUser } from "@/features/auth";
import { listOrdersForUser, OrdersList } from "@/features/orders";
import { ROUTES } from "@/lib/constants";

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
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Мои заказы
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          История покупок и статусы доставки.
        </p>
      </div>

      {dbError ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dbError}
        </p>
      ) : (
        <OrdersList orders={orders} />
      )}
    </div>
  );
}
