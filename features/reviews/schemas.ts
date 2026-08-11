import { z } from "zod";

/** Empty string → undefined (optional text fields). */
const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const ratingField = z.coerce
  .number()
  .int("Оценка должна быть целым числом")
  .min(1, "Минимальная оценка — 1")
  .max(5, "Максимальная оценка — 5");

export const reviewTextField = z.preprocess(
  emptyToUndef,
  z
    .string()
    .trim()
    .min(3, "Слишком короткий текст отзыва")
    .max(3000, "Слишком длинный текст отзыва")
    .optional()
    .nullable(),
);

export const reviewTitleField = z.preprocess(
  emptyToUndef,
  z.string().trim().max(150, "Слишком длинный заголовок").optional().nullable(),
);

export const createReviewSchema = z.object({
  orderItemId: z.string().cuid("Некорректная покупка"),
  rating: ratingField,
  title: reviewTitleField,
  text: reviewTextField,
  recommended: z.preprocess(
    (v) =>
      v === "true" || v === "on" || v === "1" || v === true
        ? true
        : v === "false" || v === "0" || v === false
          ? false
          : undefined,
    z.boolean().optional().nullable(),
  ),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const editReviewSchema = z.object({
  reviewId: z.string().cuid(),
  rating: ratingField,
  title: reviewTitleField,
  text: reviewTextField,
  recommended: createReviewSchema.shape.recommended,
});

export type EditReviewInput = z.infer<typeof editReviewSchema>;

export const sellerReplySchema = z.object({
  reviewId: z.string().cuid(),
  text: z
    .string()
    .trim()
    .min(2, "Слишком короткий ответ")
    .max(2000, "Слишком длинный ответ"),
});

export type SellerReplyInput = z.infer<typeof sellerReplySchema>;

export const reviewSortSchema = z
  .enum(["newest", "highest", "lowest"])
  .default("newest");

export type ReviewSort = z.infer<typeof reviewSortSchema>;
