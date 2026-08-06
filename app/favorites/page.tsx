import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { FavoritesGrid, listFavoriteProducts } from "@/features/favorites";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Избранное",
};

export default async function FavoritesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.FAVORITES)}`,
    );
  }

  let products: Awaited<ReturnType<typeof listFavoriteProducts>> = [];
  let dbError: string | null = null;

  try {
    products = await listFavoriteProducts(user.id);
  } catch (err) {
    console.error("[favorites]", err);
    dbError = "Не удалось загрузить избранное";
  }

  return (
    <AccountShell
      title="Избранное"
      description="Товары, которые вы сохранили."
    >
      {dbError ? (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dbError}
        </p>
      ) : (
        <FavoritesGrid products={products} />
      )}
    </AccountShell>
  );
}
