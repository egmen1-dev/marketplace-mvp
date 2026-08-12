import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AccountShell } from "@/features/account";
import { getSessionUser, loadUserAuthFromDb } from "@/features/auth";
import { ConversationThread } from "@/features/chat";
import { adminDeleteConversationAction } from "@/features/chat/actions";
import { ChatError, getConversationDetail } from "@/features/chat/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export async function generateMetadata() {
  return { title: "Диалог" };
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const user = await getSessionUser();
  if (!user) {
    redirect(
      `${ROUTES.AUTH_SIGN_IN}?callbackUrl=${encodeURIComponent(`${ROUTES.ACCOUNT_MESSAGES}/${conversationId}`)}`,
    );
  }

  const dbUser = await loadUserAuthFromDb(user.id);
  if (!dbUser) {
    redirect(ROUTES.AUTH_SIGN_IN);
  }

  let conversation;
  try {
    conversation = await getConversationDetail({
      conversationId,
      viewer: {
        id: dbUser.id,
        role: dbUser.role,
        sellerProfileId: dbUser.sellerProfileId,
      },
    });
  } catch (err) {
    if (err instanceof ChatError && err.code === "NOT_FOUND") notFound();
    if (err instanceof ChatError && err.code === "FORBIDDEN") {
      redirect(ROUTES.ACCOUNT_MESSAGES);
    }
    throw err;
  }

  const counterpart =
    conversation.buyer.id === user.id
      ? conversation.seller.storeName
      : (conversation.buyer.name ?? conversation.buyer.email);

  return (
    <AccountShell
      title={counterpart}
      description={conversation.product.title}
      actions={
        <div className="flex flex-wrap gap-2">
          {dbUser.role === "ADMIN" ? (
            <form
              action={async () => {
                "use server";
                await adminDeleteConversationAction(conversationId);
                redirect(ROUTES.ACCOUNT_MESSAGES);
              }}
            >
              <Button type="submit" variant="destructive" size="sm">
                Закрыть диалог
              </Button>
            </form>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={ROUTES.ACCOUNT_MESSAGES} />}
          >
            Все диалоги
          </Button>
        </div>
      }
    >
      <ConversationThread
        conversation={conversation}
        viewerId={user.id}
        readOnly={dbUser.role === "ADMIN"}
      />
    </AccountShell>
  );
}
