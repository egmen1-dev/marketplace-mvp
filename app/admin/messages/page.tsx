import { ConversationsList } from "@/features/chat";
import { listAllConversationsForAdmin } from "@/features/chat/queries";
import { adminConversationPath } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = { title: "Чаты — модерация" };

export default async function AdminMessagesPage() {
  const conversations = await listAllConversationsForAdmin({ limit: 100 });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Диалоги
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Просмотр переписок для поддержки. Администратор не может писать от
          имени участников.
        </p>
      </div>
      <ConversationsList
        conversations={conversations}
        getHref={adminConversationPath}
        emptyHint="Диалогов пока нет."
      />
    </div>
  );
}
