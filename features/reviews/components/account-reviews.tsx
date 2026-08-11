"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BuyerReviewItem, SellerReviewItem } from "@/features/reviews/queries";
import { ReviewStars } from "./review-stars";
import { ReviewForm } from "./review-form";
import { SellerReplyForm } from "./seller-reply-form";

export type AwaitingItem = {
  orderItemId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productSlug: string | null;
  completedAt: string;
};

type Props = {
  awaiting: AwaitingItem[];
  myReviews: BuyerReviewItem[];
  sellerReviews: SellerReviewItem[] | null;
};

type Tab = "awaiting" | "mine" | "seller";

export function AccountReviews({ awaiting, myReviews, sellerReviews }: Props) {
  const [tab, setTab] = useState<Tab>(awaiting.length ? "awaiting" : "mine");
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [replying, setReplying] = useState<string | null>(null);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "awaiting", label: "Ожидают отзыва", count: awaiting.length },
    { key: "mine", label: "Мои отзывы", count: myReviews.length },
    ...(sellerReviews
      ? [{ key: "seller" as const, label: "О товарах", count: sellerReviews.length }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            data-testid={`reviews-tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-xl border px-3 py-1.5 text-sm font-medium",
              tab === t.key
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {t.label} · {t.count}
          </button>
        ))}
      </div>

      {tab === "awaiting" ? (
        <div className="flex flex-col gap-3">
          {awaiting.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нет товаров, ожидающих отзыва. Отзыв можно оставить после получения заказа.
            </p>
          ) : (
            awaiting.map((a) => (
              <div
                key={a.orderItemId}
                className="rounded-2xl border border-border bg-surface/40 p-4"
                data-testid="awaiting-review-item"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`${ROUTES.PRODUCT}/${a.productId}`}
                      className="font-heading text-sm font-medium hover:text-primary"
                    >
                      {a.productName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Заказ {a.orderNumber}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    data-testid="leave-review-cta"
                    onClick={() =>
                      setOpenForm(openForm === a.orderItemId ? null : a.orderItemId)
                    }
                  >
                    {openForm === a.orderItemId ? "Скрыть" : "Оставить отзыв"}
                  </Button>
                </div>
                {openForm === a.orderItemId ? (
                  <div className="mt-3">
                    <ReviewForm
                      mode="create"
                      orderItemId={a.orderItemId}
                      onDone={() => setOpenForm(null)}
                    />
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "mine" ? (
        <div className="flex flex-col gap-3">
          {myReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">Вы ещё не оставляли отзывов.</p>
          ) : (
            myReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-surface/40 p-4"
                data-testid="my-review-item"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`${ROUTES.PRODUCT}/${r.productId}`}
                    className="font-heading text-sm font-medium hover:text-primary"
                  >
                    {r.productName}
                  </Link>
                  {r.editable ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(editing === r.id ? null : r.id)}
                    >
                      {editing === r.id ? "Отмена" : "Изменить отзыв"}
                    </Button>
                  ) : null}
                </div>
                <div className="mt-2">
                  <ReviewStars value={r.rating} />
                </div>
                {r.title ? <p className="mt-1 text-sm font-medium">{r.title}</p> : null}
                {r.text ? (
                  <p className="mt-1 text-sm whitespace-pre-line text-foreground/90">
                    {r.text}
                  </p>
                ) : null}
                {editing === r.id ? (
                  <div className="mt-3">
                    <ReviewForm
                      mode="edit"
                      reviewId={r.id}
                      defaultRating={r.rating}
                      defaultTitle={r.title}
                      defaultText={r.text}
                      onDone={() => setEditing(null)}
                    />
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "seller" && sellerReviews ? (
        <div className="flex flex-col gap-3">
          {sellerReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              На ваши товары пока нет отзывов.
            </p>
          ) : (
            sellerReviews.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-surface/40 p-4"
                data-testid="seller-review-item"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`${ROUTES.PRODUCT}/${r.productId}`}
                    className="font-heading text-sm font-medium hover:text-primary"
                  >
                    {r.productName}
                  </Link>
                  <span className="text-xs text-muted-foreground">{r.authorName}</span>
                </div>
                <div className="mt-2">
                  <ReviewStars value={r.rating} />
                </div>
                {r.title ? <p className="mt-1 text-sm font-medium">{r.title}</p> : null}
                {r.text ? (
                  <p className="mt-1 text-sm whitespace-pre-line text-foreground/90">
                    {r.text}
                  </p>
                ) : null}
                {r.sellerReply ? (
                  <div className="mt-2 rounded-xl border border-border bg-background/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      Ваш ответ
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-line">{r.sellerReply}</p>
                  </div>
                ) : null}
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    data-testid="seller-reply-cta"
                    onClick={() => setReplying(replying === r.id ? null : r.id)}
                  >
                    {replying === r.id
                      ? "Скрыть"
                      : r.sellerReply
                        ? "Изменить ответ"
                        : "Ответить"}
                  </Button>
                  {replying === r.id ? (
                    <SellerReplyForm
                      reviewId={r.id}
                      defaultText={r.sellerReply}
                      onDone={() => setReplying(null)}
                    />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
