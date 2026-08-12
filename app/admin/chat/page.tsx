import Link from "next/link";
import { ConversationStatus } from "@prisma/client";
import { MessagesSquare } from "lucide-react";

import { adminListConversations } from "@/features/chat";
import { ChatRelativeTime } from "@/features/chat/components/chat-relative-time";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Чаты — Админ" };

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

const PAGE_SIZE = 30;

const STATUS_LABEL: Record<ConversationStatus, string> = {
  ACTIVE: "Активен",
  CLOSED: "Закрыт",
  ARCHIVED: "В архиве",
};

export default async function AdminChatPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const status =
    sp.status && sp.status in STATUS_LABEL
      ? (sp.status as ConversationStatus)
      : undefined;
  const page = Math.max(1, Number(sp.page) || 1);

  let data: Awaited<ReturnType<typeof adminListConversations>> = {
    items: [],
    total: 0,
  };
  let error: string | null = null;
  try {
    data = await adminListConversations({
      search: q,
      status,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    });
  } catch (err) {
    console.error("[admin/chat]", err);
    error = "Не удалось загрузить диалоги.";
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const buildHref = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `${ROUTES.ADMIN_CHAT}?${qs}` : ROUTES.ADMIN_CHAT;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessagesSquare className="size-5 text-primary" aria-hidden />
        <h1 className="font-heading text-2xl font-semibold">Чаты</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Просмотр диалогов покупателей и продавцов для поддержки. Только чтение —
        администратор не может писать от чужого имени.
      </p>

      <form className="flex flex-wrap gap-2" action={ROUTES.ADMIN_CHAT}>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Поиск: товар, покупатель, магазин"
          className="h-10 min-w-56 flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-10 rounded-xl border border-border bg-surface px-3 text-sm"
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Найти
        </button>
      </form>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface/60 p-6 text-center text-sm text-muted-foreground">
          Диалоги не найдены.
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Товар</th>
                <th className="px-3 py-2 font-medium">Покупатель</th>
                <th className="px-3 py-2 font-medium">Магазин</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Сообщений</th>
                <th className="px-3 py-2 font-medium">Обновлён</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">
                    <Link
                      href={`${ROUTES.ADMIN_CHAT}/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.product.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.buyer.name || c.buyer.email}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {c.seller.storeName}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        c.status === "ACTIVE"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {c.messageCount}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    <ChatRelativeTime iso={c.updatedAt} mode="list" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Стр. {page} из {totalPages} · всего {data.total}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={buildHref({ page: page - 1 })}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                Назад
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={buildHref({ page: page + 1 })}
                className="rounded-lg border border-border px-3 py-1.5"
              >
                Вперёд
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
