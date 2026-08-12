import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConversationThread } from "@/features/chat";
import { adminDeleteConversationAction } from "@/features/chat/actions";
import { ChatError, getConversationDetail } from "@/features/chat/queries";
import { requireAdminSession } from "@/features/auth";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export async function generateMetadata() {
  return { title: "Диалог — модерация" };
}

export default async function AdminConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const admin = await requireAdminSession();

  let conversation;
  try {
    conversation = await getConversationDetail({
      conversationId,
      viewer: {
        id: admin.id,
        role: admin.role,
        sellerProfileId: admin.sellerProfileId,
      },
    });
  } catch (err) {
    if (err instanceof ChatError && err.code === "NOT_FOUND") notFound();
    if (err instanceof ChatError && err.code === "FORBIDDEN") notFound();
    throw err;
  }

  const buyerLabel =
    conversation.buyer.name ?? conversation.buyer.email ?? "Покупатель";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            {buyerLabel} ↔ {conversation.seller.storeName}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {conversation.product.title}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form
            action={async () => {
              "use server";
              await adminDeleteConversationAction(conversationId);
            }}
          >
            <Button type="submit" variant="destructive" size="sm">
              Закрыть диалог
            </Button>
          </form>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={ROUTES.ADMIN_MESSAGES} />}
          >
            Все диалоги
          </Button>
        </div>
      </div>

      <ConversationThread
        conversation={conversation}
        viewerId={admin.id}
        readOnly
      />
    </div>
  );
}
