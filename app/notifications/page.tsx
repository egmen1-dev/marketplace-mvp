import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { AiNotificationCenterPanel } from "@/features/ai-experience";
import { getAiNotifications, isAiExperienceEnabled } from "@/lib/ai-experience";
import { ROUTES } from "@/lib/constants";
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

  const [aiNotifications, trustNotifications] = await Promise.all([
    isAiExperienceEnabled()
      ? getAiNotifications({
          sellerProfileId: user.sellerProfileId,
          userId: user.id,
        })
      : Promise.resolve([]),
    isTrustSafetyEnabled()
      ? getTrustNotifications({ sellerProfileId: user.sellerProfileId })
      : Promise.resolve([]),
  ]);

  const notifications = [...trustNotifications, ...aiNotifications].slice(
    0,
    16,
  );

  return (
    <AccountShell
      title="Уведомления"
      description="Внутренний inbox рекомендаций и trust-сигналов — без push и email."
    >
      <AiNotificationCenterPanel notifications={notifications} />
    </AccountShell>
  );
}
