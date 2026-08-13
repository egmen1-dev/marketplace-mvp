import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser } from "@/features/auth";
import { AiNotificationCenterPanel } from "@/features/ai-experience";
import { getAiNotifications, isAiExperienceEnabled } from "@/lib/ai-experience";
import { ROUTES } from "@/lib/constants";

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

  const notifications =
    isAiExperienceEnabled()
      ? await getAiNotifications({
          sellerProfileId: user.sellerProfileId,
          userId: user.id,
        })
      : [];

  return (
    <AccountShell
      title="AI уведомления"
      description="Внутренний inbox рекомендаций — без push и email."
    >
      <AiNotificationCenterPanel notifications={notifications} />
    </AccountShell>
  );
}
