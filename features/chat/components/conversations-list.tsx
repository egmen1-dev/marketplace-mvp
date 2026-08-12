"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatRelativeTime } from "@/features/chat/components/chat-relative-time";
import type { ConversationListItem } from "@/features/chat/queries";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import { conversationPath, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdminConversationListItem } from "@/features/chat/queries";

type Props = {
  conversations: ConversationListItem[] | AdminConversationListItem[];
  /** Override thread URL (e.g. admin moderation inbox). */
  getHref?: (conversationId: string) => string;
  emptyHint?: string;
};

export function ConversationsList({
  conversations,
  getHref = conversationPath,
  emptyHint = "Откройте товар и нажмите «Написать продавцу».",
}: Props) {
  if (conversations.length === 0) {
    return (
      <div
        className="animate-fade-up flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center"
        data-testid="messages-empty"
      >
        <MessageCircle className="size-10 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-heading text-lg font-medium">
            У вас пока нет сообщений
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
        </div>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={ROUTES.CATALOG} />}
        >
          Перейти в каталог
        </Button>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2" data-testid="messages-list">
      {conversations.map((c) => (
        <li key={c.id}>
          <Link
            href={getHref(c.id)}
            className={cn(
              "flex gap-3 rounded-2xl border border-border bg-card/60 p-3 transition-colors hover:bg-muted/40",
              c.unreadCount > 0 && "border-primary/30 bg-primary/5",
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
                {"buyerLabel" in c
                  ? `Покупатель: ${c.buyerLabel} · Продавец: ${c.sellerLabel}`
                  : `${c.counterpart.kind === "seller" ? "Продавец" : "Покупатель"}: ${c.counterpart.name}`}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="truncate text-sm text-muted-foreground">
                  {c.lastMessage?.text ?? "Нет сообщений"}
                </p>
                {c.unreadCount > 0 ? (
                  <span
                    className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground"
                    data-testid="conversation-unread"
                  >
                    {c.unreadCount > 99 ? "99+" : c.unreadCount}
                  </span>
                ) : null}
              </div>
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
