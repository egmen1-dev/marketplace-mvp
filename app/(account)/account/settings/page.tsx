import { redirect } from "next/navigation";

import {
  AccountSettingsUnifiedPanel,
  AccountShell,
  getNotificationPrefsForUser,
  getUserProfile,
} from "@/features/account";
import { SettingsCompletionPanel } from "@/features/marketplace-ux-completion";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import {
  buildSettingsView,
  isMarketplaceUxCompletionEnabled,
} from "@/lib/marketplace-ux-completion";
import { isLotWalletEnabled } from "@/lib/lot-wallet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Настройки",
};

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.SETTINGS)}`,
    );
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    redirect(ROUTES.AUTH_SIGN_IN);
  }

  const dbUser = await loadUserAuthFromDb(user.id);
  const isSeller = Boolean(
    dbUser?.sellerProfileId &&
      (dbUser.role === "SELLER" || dbUser.role === "ADMIN"),
  );

  const notificationPrefs = await getNotificationPrefsForUser(user.id);

  if (isLotWalletEnabled()) {
    return (
      <AccountShell
        title="Настройки"
        description="Профиль, безопасность и уведомления — в одном месте."
      >
        <AccountSettingsUnifiedPanel
          profile={profile}
          notificationPrefs={notificationPrefs}
          isSeller={isSeller}
        />
      </AccountShell>
    );
  }

  const settingsView = isMarketplaceUxCompletionEnabled()
    ? buildSettingsView({ email: profile.email, isSeller })
    : null;

  return (
    <AccountShell
      title="Настройки"
      description="Управление данными аккаунта."
    >
      {settingsView?.enabled ? (
        <SettingsCompletionPanel view={settingsView} />
      ) : (
        <AccountSettingsUnifiedPanel
          profile={profile}
          notificationPrefs={notificationPrefs}
          isSeller={isSeller}
        />
      )}
    </AccountShell>
  );
}
