"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sellerReplyAction, type ReviewActionState } from "@/features/reviews/actions";

const initial: ReviewActionState = { ok: false };

/** Seller replies to a review of their own product (single reply). */
export function SellerReplyForm({
  reviewId,
  defaultText,
  onDone,
}: {
  reviewId: string;
  defaultText?: string | null;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(sellerReplyAction, initial);

  useEffect(() => {
    if (state.ok) {
      toast.success("Ответ отправлен");
      onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="mt-2 flex flex-col gap-2" data-testid="seller-reply-form">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Textarea
        name="text"
        rows={2}
        required
        placeholder="Ваш ответ покупателю…"
        className="rounded-xl bg-surface"
        maxLength={2000}
        defaultValue={defaultText ?? ""}
        disabled={pending}
      />
      <Button type="submit" size="sm" variant="secondary" className="w-fit" disabled={pending}>
        {pending ? "Отправляем…" : defaultText ? "Обновить ответ" : "Ответить"}
      </Button>
    </form>
  );
}
