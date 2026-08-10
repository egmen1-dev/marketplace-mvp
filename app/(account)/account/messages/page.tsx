import { redirect } from "next/navigation";

import { AccountShell } from "@/features/account";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { ConversationsList } from "@/features/chat";
import { listConversationsForUser } from "@/features/chat/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Сообщения" };

export default async function MessagesPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(ROUTES.ACCOUNT_MESSAGES)}`,
    );
  }

  const dbUser = await loadUserAuthFromDb(user.id);
  const conversations = await listConversationsForUser({
    userId: user.id,
    sellerProfileId: dbUser?.sellerProfileId ?? null,
  });

  return (
    <AccountShell
      title="Сообщения"
      description="Общение с покупателями и продавцами по товарам."
    >
      <ConversationsList conversations={conversations} />
    </AccountShell>
  );
}
