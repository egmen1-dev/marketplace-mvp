import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { AiNotificationCenterPanel } from "@/features/ai-experience";
import { ROUTES } from "@/lib/constants";
import {
  getCommandCenterNotifications,
  isMarketplaceCommandCenterEnabled,
} from "@/lib/marketplace-command-center";
import {
  getPromotionCenterNotifications,
  isSellerPromotionCenterEnabled,
} from "@/lib/seller-promotion-center";
import { getAiNotifications, isAiExperienceEnabled } from "@/lib/ai-experience";
import {
  getTrustNotifications,
  isTrustSafetyEnabled,
} from "@/lib/trust-safety";

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

  const notifications = isMarketplaceCommandCenterEnabled()
    ? await getCommandCenterNotifications({
        sellerProfileId: user.sellerProfileId,
        userId: user.id,
      })
    : [
        ...(isSellerPromotionCenterEnabled() && user.sellerProfileId
          ? await getPromotionCenterNotifications({
              sellerProfileId: user.sellerProfileId,
            })
          : []),
        ...(isTrustSafetyEnabled()
          ? await getTrustNotifications({ sellerProfileId: user.sellerProfileId })
          : []),
        ...(isAiExperienceEnabled()
          ? await getAiNotifications({
              sellerProfileId: user.sellerProfileId,
              userId: user.id,
            })
          : []),
      ].slice(0, 20);

  return (
    <AccountShell
      title="Уведомления"
      description="AI recommendations, execution tasks, trust warnings, promotion and learning results — inbox only."
    >
      <AiNotificationCenterPanel notifications={notifications} />
    </AccountShell>
  );
}
