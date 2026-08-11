"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createReviewAction,
  editReviewAction,
  type ReviewActionState,
} from "@/features/reviews/actions";
import { RatingInput } from "./rating-input";

const initial: ReviewActionState = { ok: false };

type CreateProps = {
  mode: "create";
  orderItemId: string;
  onDone?: () => void;
};

type EditProps = {
  mode: "edit";
  reviewId: string;
  defaultRating: number;
  defaultTitle?: string | null;
  defaultText?: string | null;
  onDone?: () => void;
};

type Props = CreateProps | EditProps;

/** Buyer review form (create or edit). Rating is required. */
export function ReviewForm(props: Props) {
  const action = props.mode === "create" ? createReviewAction : editReviewAction;
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.ok) {
      toast.success(
        props.mode === "create" ? "Ваш отзыв опубликован" : "Отзыв обновлён",
      );
      props.onDone?.();
    } else if (state.error) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-4"
      data-testid="review-form"
    >
      {props.mode === "create" ? (
        <input type="hidden" name="orderItemId" value={props.orderItemId} />
      ) : (
        <input type="hidden" name="reviewId" value={props.reviewId} />
      )}

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Ваша оценка</span>
        <RatingInput
          defaultValue={props.mode === "edit" ? props.defaultRating : 0}
          disabled={pending}
        />
        {state.fieldErrors?.rating?.[0] ? (
          <p className="text-xs text-destructive">{state.fieldErrors.rating[0]}</p>
        ) : null}
      </div>

      <Input
        name="title"
        placeholder="Заголовок (необязательно)"
        maxLength={150}
        defaultValue={props.mode === "edit" ? (props.defaultTitle ?? "") : ""}
        disabled={pending}
      />
      <Textarea
        name="text"
        rows={4}
        placeholder="Поделитесь впечатлением о товаре (необязательно)"
        className="rounded-xl bg-surface"
        maxLength={3000}
        defaultValue={props.mode === "edit" ? (props.defaultText ?? "") : ""}
        disabled={pending}
      />
      {state.fieldErrors?.text?.[0] ? (
        <p className="text-xs text-destructive">{state.fieldErrors.text[0]}</p>
      ) : null}

      <Button type="submit" size="sm" className="w-fit" disabled={pending}>
        {pending
          ? "Отправляем…"
          : props.mode === "create"
            ? "Опубликовать отзыв"
            : "Сохранить изменения"}
      </Button>
    </form>
  );
}
