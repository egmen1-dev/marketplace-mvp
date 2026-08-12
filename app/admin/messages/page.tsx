import { AdminConversationsList } from "@/features/chat/components/admin-conversations-list";
import { listAllConversationsForAdmin } from "@/features/chat/queries";
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
      <AdminConversationsList
        conversations={conversations}
        emptyHint="Диалогов пока нет."
      />
    </div>
  );
}
