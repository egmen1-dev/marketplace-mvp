import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireAdminSession } from "@/features/auth";
import { ChatError, getConversationDetail } from "@/features/chat";
import { ConversationThread } from "@/features/chat/components/conversation-thread";
import { logAdminAction } from "@/features/admin/queries";
import { ROUTES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Диалог — Админ" };

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function AdminChatThreadPage({ params }: PageProps) {
  const { conversationId } = await params;
  const admin = await requireAdminSession();

  let conversation;
  try {
    conversation = await getConversationDetail({
      conversationId,
      viewer: {
        id: admin.id,
        role: "ADMIN",
        sellerProfileId: admin.sellerProfileId ?? null,
      },
    });
  } catch (err) {
    if (err instanceof ChatError && err.code === "NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  // Audit every admin support view (no message content is stored).
  await logAdminAction({
    adminId: admin.id,
    action: "chat.view",
    entityType: "conversation",
    entityId: conversationId,
    meta: {
      productId: conversation.product.id,
      buyerId: conversation.buyer.id,
      sellerId: conversation.seller.id,
    },
  });

  return (
    <div className="space-y-4">
      <Link
        href={ROUTES.ADMIN_CHAT}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Все диалоги
      </Link>

      <ConversationThread
        conversation={conversation}
        viewerId={admin.id}
        readOnly
      />
    </div>
  );
}
