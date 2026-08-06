import { redirect } from "next/navigation";

import {
  AccountShell,
  HistoryGrid,
  listRecentlyViewedProducts,
} from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "История просмотров",
};

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.HISTORY)}`,
    );
  }

  let products: Awaited<ReturnType<typeof listRecentlyViewedProducts>> = [];
  let dbError: string | null = null;

  try {
    products = await listRecentlyViewedProducts(user.id);
  } catch (err) {
    console.error("[history]", err);
    dbError = "Не удалось загрузить историю";
  }

  return (
    <AccountShell
      title="История"
      description="Последние 20 просмотренных товаров."
    >
      {dbError ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dbError}
        </p>
      ) : (
        <HistoryGrid products={products} />
      )}
    </AccountShell>
  );
}
