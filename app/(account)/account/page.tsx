import { redirect } from "next/navigation";

import {
  AccountDashboard,
  AccountShell,
  getUserProfile,
} from "@/features/account";
import { AccountOverviewPanel } from "@/features/marketplace-ux-completion";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { listFavoriteIds } from "@/features/favorites";
import { SellerJourneyPanel } from "@/features/seller-lifecycle";
import { SellerJourneyCard } from "@/features/seller-journey";
import { getSellerDashboardStats } from "@/features/seller/queries";
import { ROUTES } from "@/lib/constants";
import {
  buildAccountOverview,
  isMarketplaceUxCompletionEnabled,
} from "@/lib/marketplace-ux-completion";
import { getWalletOverview, isLotWalletEnabled } from "@/lib/lot-wallet";
import {
  getSellerLifecycleDashboard,
  isSellerLifecycleEnabled,
} from "@/lib/seller-lifecycle";
import {
  getSellerJourneyDashboard,
  isSellerJourneyEnabled,
} from "@/lib/seller-journey";
import { isSellerOperatingDeskEnabled } from "@/lib/seller-operating-desk/flags";
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

  if (isSeller && isSellerOperatingDeskEnabled() && !promptSell && !isMarketplaceUxCompletionEnabled()) {
    redirect(ROUTES.ACCOUNT_BUSINESS);
  }

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
  let journey = null;
  let journeyUx = null;

  if (isSeller && dbUser?.sellerProfileId) {
    const [stats, lifecycle, ux] = await Promise.all([
      getSellerDashboardStats(dbUser.sellerProfileId),
      isSellerLifecycleEnabled() && !isSellerJourneyEnabled()
        ? getSellerLifecycleDashboard(dbUser.sellerProfileId)
        : Promise.resolve(null),
      isSellerJourneyEnabled()
        ? getSellerJourneyDashboard(dbUser.sellerProfileId)
        : Promise.resolve(null),
    ]);
    productsCount = stats.totalProducts;
    revenue = stats.revenue;
    journey = lifecycle;
    journeyUx = ux;
  }

  const uxOverview =
    isMarketplaceUxCompletionEnabled()
      ? await buildAccountOverview({
          profile: {
            name: profile.name,
            email: profile.email,
            phone: profile.phone,
            city: profile.city,
            avatarUrl: profile.avatarUrl,
          },
          isSeller,
          favoritesCount: favoriteIds.length,
          ordersCount,
          productsCount,
          revenue,
          walletBuckets: isLotWalletEnabled()
            ? (
                await getWalletOverview({
                  userId: user.id,
                  sellerProfileId: dbUser?.sellerProfileId ?? null,
                })
              ).buckets
            : null,
        })
      : null;

  return (
    <AccountShell
      title={isMarketplaceUxCompletionEnabled() ? "Мой аккаунт" : "Личный кабинет"}
      description={
        isMarketplaceUxCompletionEnabled()
          ? "Покупки и продажи в одном аккаунте — переключайте режим."
          : "Покупки, избранное и продажи в одном месте."
      }
    >
      {uxOverview?.enabled ? (
        <AccountOverviewPanel overview={uxOverview} />
      ) : (
        <AccountDashboard
          profile={profile}
          favoritesCount={favoriteIds.length}
          ordersCount={ordersCount}
          productsCount={productsCount}
          revenue={revenue}
          isSeller={isSeller}
          promptSell={promptSell}
        />
      )}
      {journeyUx?.enabled ? <SellerJourneyCard data={journeyUx} compact /> : null}
      {journey?.enabled ? <SellerJourneyPanel data={journey} /> : null}
    </AccountShell>
  );
}
