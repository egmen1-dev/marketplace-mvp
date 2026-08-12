import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { ChatRelativeTime } from "@/features/chat/components/chat-relative-time";
import type { AdminConversationListItem } from "@/features/chat/queries";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import { adminConversationPath } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  conversations: AdminConversationListItem[];
  emptyHint?: string;
};

/** Server-rendered inbox for admin moderation (no client function props). */
export function AdminConversationsList({
  conversations,
  emptyHint = "Диалогов пока нет.",
}: Props) {
  if (conversations.length === 0) {
    return (
      <div
        className="animate-fade-up flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center"
        data-testid="messages-empty"
      >
        <MessageCircle className="size-10 text-muted-foreground" aria-hidden />
        <p className="font-heading text-lg font-medium">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="messages-list">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={adminConversationPath(c.id)}
            className={cn(
              "flex gap-3 rounded-2xl border border-border bg-card/60 p-3 transition-colors hover:bg-muted/40",
            )}
            data-testid="conversation-row"
          >
            <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
              <ProductImage
                src={c.product.imageUrl}
                alt={c.product.title}
                fill
                sizes="56px"
                fallbackLabel={false}
                containerClassName="absolute inset-0"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-heading text-sm font-semibold">
                  {c.product.title}
                </p>
                <ChatRelativeTime
                  iso={c.lastMessage?.createdAt ?? c.updatedAt}
                  mode="list"
                  className="shrink-0 text-xs text-muted-foreground tabular-nums"
                />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                Покупатель: {c.buyerLabel} · Продавец: {c.sellerLabel}
              </p>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {c.lastMessage?.text ?? "Нет сообщений"}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {formatPrice(c.product.price, c.product.currency)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
