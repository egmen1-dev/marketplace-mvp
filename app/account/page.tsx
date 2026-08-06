import { redirect } from "next/navigation";

import {
  AccountDashboard,
  AccountShell,
  getUserProfile,
} from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { listFavoriteIds } from "@/features/favorites";
import { ROUTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Личный кабинет",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT)}`,
    );
  }

  const [profile, favoriteIds, ordersCount] = await Promise.all([
    getUserProfile(user.id),
    listFavoriteIds(user.id),
    prisma.order.count({ where: { userId: user.id } }),
  ]);

  if (!profile) {
    redirect(ROUTES.AUTH_SIGN_IN);
  }

  return (
    <AccountShell
      title="Личный кабинет"
      description="Профиль, избранное, история и заказы в одном месте."
    >
      <AccountDashboard
        profile={profile}
        favoritesCount={favoriteIds.length}
        ordersCount={ordersCount}
      />
    </AccountShell>
  );
}
