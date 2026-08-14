"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { createReviewAction } from "@/lib/marketplace-trust-loop/reviews/actions";

type ReviewFormProps = {
  orderId: string;
  productId: string;
  productName: string;
};

export function ReviewForm({ orderId, productId, productName }: ReviewFormProps) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createReviewAction({
        orderId,
        productId,
        rating,
        text,
        pros,
        cons,
      });
      setMessage(result.ok ? "Отзыв отправлен на модерацию" : result.error ?? "Ошибка");
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4" data-testid="review-form">
      <h3 className="font-medium">Оцените покупку</h3>
      <p className="mt-1 text-sm text-muted-foreground">{productName}</p>
      <div className="mt-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`h-10 w-10 rounded-lg border ${star <= rating ? "bg-primary text-primary-foreground" : "border-border"}`}
            onClick={() => setRating(star)}
          >
            {star}
          </button>
        ))}
      </div>
      <textarea
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm"
        placeholder="Комментарий"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <input
        className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm"
        placeholder="Что понравилось?"
        value={pros}
        onChange={(e) => setPros(e.target.value)}
      />
      <input
        className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm"
        placeholder="Что можно улучшить?"
        value={cons}
        onChange={(e) => setCons(e.target.value)}
      />
      <Button className="mt-3" disabled={pending} onClick={submit}>
        Отправить отзыв
      </Button>
      {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
