"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  sendMessageAction,
  type ChatActionState,
} from "@/features/chat/actions";
import { ChatRelativeTime } from "@/features/chat/components/chat-relative-time";
import type { ConversationDetail } from "@/features/chat/queries";
import { ProductImage } from "@/features/products/components/product-image";
import { formatPrice } from "@/features/products/mappers";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Props = {
  conversation: ConversationDetail;
  viewerId: string;
  /** Admin read-only mode — hides composer */
  readOnly?: boolean;
};

const initial: ChatActionState = { ok: false };

export function ConversationThread({
  conversation,
  viewerId,
  readOnly = false,
}: Props) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    sendMessageAction,
    initial,
  );

  const counterpartName =
    conversation.buyer.id === viewerId
      ? conversation.seller.storeName
      : conversation.buyer.name || conversation.buyer.email || "Покупатель";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversation.messages.length]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div
      className="flex min-h-[70vh] flex-col rounded-2xl border border-border bg-card/40 sm:min-h-[75vh]"
      data-testid="conversation-thread"
    >
      {/* Product header */}
      <div className="flex gap-3 border-b border-border p-3 sm:p-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl sm:size-20">
          <ProductImage
            src={conversation.product.imageUrl}
            alt={conversation.product.title}
            fill
            sizes="80px"
            fallbackLabel={false}
            containerClassName="absolute inset-0"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading text-base font-semibold">
            {conversation.product.title}
          </p>
          <p className="text-sm font-medium text-primary tabular-nums">
            {formatPrice(
              conversation.product.price,
              conversation.product.currency,
            )}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {counterpartName}
          </p>
          <Button
            variant="link"
            size="sm"
            className="mt-1 h-auto px-0"
            nativeButton={false}
            render={
              <Link href={`${ROUTES.PRODUCT}/${conversation.product.id}`} />
            }
          >
            <ExternalLink data-icon="inline-start" className="size-3.5" />
            Открыть товар
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-4 sm:px-4">
        {conversation.messages.map((m) => {
          const isSystem =
            m.type === "SYSTEM" ||
            m.type === "ORDER" ||
            m.type === "RESERVATION";
          const isMine = m.senderId === viewerId;

          if (isSystem) {
            return (
              <div
                key={m.id}
                className="mx-auto max-w-[90%] rounded-full bg-muted/80 px-3 py-1 text-center text-xs text-muted-foreground"
                data-testid="chat-system-message"
              >
                {m.text}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              className={cn(
                "flex max-w-[85%] flex-col gap-0.5",
                isMine ? "self-end items-end" : "self-start items-start",
              )}
              data-testid="chat-message"
              data-mine={isMine ? "true" : "false"}
            >
              <div
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                  isMine
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md bg-muted text-foreground",
                )}
              >
                {m.text}
              </div>
              <ChatRelativeTime
                iso={m.createdAt}
                mode="thread"
                className="px-1 text-[10px] text-muted-foreground tabular-nums"
              />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {readOnly ? (
        <div
          className="sticky bottom-0 border-t border-border bg-muted/50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground sm:p-4"
          data-testid="chat-readonly-notice"
        >
          Режим просмотра: администратор не может отправлять сообщения от имени
          участников.
        </div>
      ) : (
      <form
        ref={formRef}
        action={formAction}
        className="sticky bottom-0 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:p-4"
      >
        <input
          type="hidden"
          name="conversationId"
          value={conversation.id}
        />
        {state.error ? (
          <p className="mb-2 text-xs text-destructive">{state.error}</p>
        ) : null}
        <div className="flex items-end gap-2">
          <Textarea
            name="text"
            required
            rows={1}
            placeholder="Напишите сообщение..."
            className="min-h-11 max-h-32 flex-1 resize-y rounded-xl"
            data-testid="chat-input"
            disabled={pending || conversation.status !== "ACTIVE"}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            size="cta"
            className="h-11 shrink-0 rounded-xl px-4"
            disabled={pending || conversation.status !== "ACTIVE"}
            data-testid="chat-send"
            aria-label="Отправить"
          >
            <Send className="size-4" data-icon="inline-start" />
            <span className="hidden sm:inline">Отправить</span>
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
