import { redirect } from "next/navigation";

import {
  AccountDashboard,
  AccountShell,
  getUserProfile,
} from "@/features/account";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { listFavoriteIds } from "@/features/favorites";
import { getSellerDashboardStats } from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Личный кабинет",
};

type PageProps = {
  searchParams: Promise<{ sell?: string }>;
};

export default async function AccountPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT)}`,
    );
  }

  const params = await searchParams;
  const promptSell = params.sell === "1";

  const dbUser = await loadUserAuthFromDb(user.id);
  const isSeller = Boolean(
    dbUser?.sellerProfileId &&
      (dbUser.role === "SELLER" || dbUser.role === "ADMIN"),
  );

  const [profile, favoriteIds, ordersCount] = await Promise.all([
    getUserProfile(user.id),
    listFavoriteIds(user.id),
    prisma.order.count({ where: { userId: user.id } }),
  ]);

  if (!profile) {
    redirect(ROUTES.AUTH_SIGN_IN);
  }

  let productsCount: number | null = null;
  let revenue: number | null = null;

  if (isSeller && dbUser?.sellerProfileId) {
    const stats = await getSellerDashboardStats(dbUser.sellerProfileId);
    productsCount = stats.totalProducts;
    revenue = stats.revenue;
  }

  return (
    <AccountShell
      title="Личный кабинет"
      description="Покупки, избранное и продажи в одном месте."
    >
      <AccountDashboard
        profile={profile}
        favoritesCount={favoriteIds.length}
        ordersCount={ordersCount}
        productsCount={productsCount}
        revenue={revenue}
        isSeller={isSeller}
        promptSell={promptSell}
      />
    </AccountShell>
  );
}
