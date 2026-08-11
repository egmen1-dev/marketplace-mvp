"use server";

import { revalidatePath } from "next/cache";

import { getSessionUser } from "@/features/auth";
import { ROUTES } from "@/lib/constants";
import { ReviewError } from "./eligibility";
import {
  createReview,
  editReview,
  moderateReview,
  removeReviewByBuyer,
  sellerReplyToReview,
  type ModerationAction,
} from "./queries";
import {
  createReviewSchema,
  editReviewSchema,
  sellerReplySchema,
} from "./schemas";

export type ReviewActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  reviewId?: string;
};

function fail(error: string, fieldErrors?: Record<string, string[]>): ReviewActionState {
  return { ok: false, error, fieldErrors };
}

function handleError(err: unknown): ReviewActionState {
  if (err instanceof ReviewError) return fail(err.message);
  console.error("[reviews:action]", err);
  return fail("Не удалось выполнить действие. Попробуйте ещё раз.");
}

export async function createReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getSessionUser();
  if (!session) return fail("Войдите, чтобы оставить отзыв");

  const parsed = createReviewSchema.safeParse({
    orderItemId: formData.get("orderItemId"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    text: formData.get("text"),
    recommended: formData.get("recommended"),
  });
  if (!parsed.success) {
    return fail("Проверьте форму", parsed.error.flatten().fieldErrors);
  }

  try {
    const review = await createReview(session.id, parsed.data);
    revalidatePath(`${ROUTES.PRODUCT}/${review.productId}`);
    revalidatePath(ROUTES.ACCOUNT_REVIEWS);
    return { ok: true, reviewId: review.id };
  } catch (err) {
    return handleError(err);
  }
}

export async function editReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getSessionUser();
  if (!session) return fail("Войдите в аккаунт");

  const parsed = editReviewSchema.safeParse({
    reviewId: formData.get("reviewId"),
    rating: formData.get("rating"),
    title: formData.get("title"),
    text: formData.get("text"),
    recommended: formData.get("recommended"),
  });
  if (!parsed.success) {
    return fail("Проверьте форму", parsed.error.flatten().fieldErrors);
  }

  try {
    const review = await editReview(session.id, parsed.data);
    revalidatePath(`${ROUTES.PRODUCT}/${review.productId}`);
    revalidatePath(ROUTES.ACCOUNT_REVIEWS);
    return { ok: true, reviewId: review.id };
  } catch (err) {
    return handleError(err);
  }
}

export async function removeReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getSessionUser();
  if (!session) return fail("Войдите в аккаунт");
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!reviewId) return fail("Некорректный отзыв");
  try {
    await removeReviewByBuyer(session.id, reviewId);
    revalidatePath(ROUTES.ACCOUNT_REVIEWS);
    return { ok: true };
  } catch (err) {
    return handleError(err);
  }
}

export async function sellerReplyAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getSessionUser();
  if (!session) return fail("Войдите в аккаунт");

  const parsed = sellerReplySchema.safeParse({
    reviewId: formData.get("reviewId"),
    text: formData.get("text"),
  });
  if (!parsed.success) {
    return fail("Проверьте форму", parsed.error.flatten().fieldErrors);
  }

  try {
    await sellerReplyToReview(session.id, parsed.data);
    revalidatePath(ROUTES.ACCOUNT_REVIEWS);
    return { ok: true };
  } catch (err) {
    return handleError(err);
  }
}

/** Form-friendly admin moderation (used directly in a server-component form). */
export async function adminModerateReview(formData: FormData): Promise<void> {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") return;
  const reviewId = String(formData.get("reviewId") ?? "");
  const action = String(formData.get("action") ?? "") as ModerationAction;
  if (!reviewId || !["hide", "restore", "remove"].includes(action)) return;
  await moderateReview(session.id, reviewId, action);
  revalidatePath(ROUTES.ADMIN_REVIEWS);
}

export async function moderateReviewAction(
  _prev: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return fail("Недостаточно прав");
  }
  const reviewId = String(formData.get("reviewId") ?? "");
  const action = String(formData.get("action") ?? "") as ModerationAction;
  if (!reviewId || !["hide", "restore", "remove"].includes(action)) {
    return fail("Некорректное действие");
  }
  try {
    await moderateReview(session.id, reviewId, action);
    revalidatePath(ROUTES.ADMIN_REVIEWS);
    return { ok: true };
  } catch (err) {
    return handleError(err);
  }
}
