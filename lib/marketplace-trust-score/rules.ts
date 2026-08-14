import { clampTrustScore, MAX_DAILY_TRUST_DELTA, MAX_EVENT_TRUST_DELTA } from "./constants";

/** Shipping speed delta for a single shipped order (hours from confirmation to ship). */
export function shippingSpeedDelta(hours: number): number {
  if (hours <= 24) return 0.5;
  if (hours <= 48) return 0;
  if (hours <= 96) return -2;
  return -5;
}

export function describeShippingSpeedDelta(hours: number, orderNumber?: string): string {
  const days = Math.round(hours / 24);
  const suffix = orderNumber ? ` №${orderNumber}` : "";
  if (hours <= 24) return `Заказ${suffix} отправлен в течение 24 часов (+0.5)`;
  if (hours <= 48) return `Заказ${suffix} отправлен за ${days} дн. (без изменений)`;
  if (hours <= 96) return `Заказ${suffix} был отправлен через ${days} дня (−2)`;
  return `Заказ${suffix} был отправлен через ${days} дней (−5)`;
}

/** Seller-initiated cancellation delta. */
export function sellerCancellationDelta(repeatOffence: boolean): number {
  return repeatOffence ? -10 : -5;
}

export function describeSellerCancellation(orderNumber?: string, repeatOffence = false): string {
  const suffix = orderNumber ? ` №${orderNumber}` : "";
  return repeatOffence
    ? `Повторная отмена заказа${suffix} по вине продавца (−10)`
    : `Отмена заказа${suffix} по вине продавца (−5)`;
}

export function successfulDeliveryDelta(): number {
  return 0.2;
}

export function problematicOrderDelta(): number {
  return -3;
}

/** Review rating delta (+ optional photo bonus). */
export function reviewRatingDelta(rating: number, hasPhoto = false): number {
  let delta = 0;
  if (rating === 5) delta = 0.5;
  else if (rating === 4) delta = 0.2;
  else if (rating === 3) delta = 0;
  else if (rating === 2) delta = -1;
  else if (rating === 1) delta = -2;
  if (hasPhoto) delta += 0.2;
  return delta;
}

export function describeReviewDelta(rating: number, hasPhoto = false): string {
  const stars = `${rating} ${rating === 1 ? "звезда" : rating < 5 ? "звезды" : "звёзд"}`;
  const photo = hasPhoto ? " с фото" : "";
  const delta = reviewRatingDelta(rating, hasPhoto);
  const sign = delta > 0 ? `+${delta}` : `${delta}`;
  return `Отзыв${photo}: ${stars} (${sign})`;
}

/** Product card quality deltas applied to factor score baseline adjustments. */
export function productCardQualityAdjustments(input: {
  imageCount: number;
  hasPrimary: boolean;
  characteristicCount: number;
  descriptionLength: number;
}): number {
  let delta = 0;
  if (input.imageCount >= 3 && input.hasPrimary) delta += 5;
  if (!input.hasPrimary) delta -= 10;
  if (input.characteristicCount >= 3) delta += 3;
  else if (input.characteristicCount === 0) delta -= 5;
  if (input.descriptionLength >= 30) delta += 2;
  else if (input.descriptionLength === 0) delta -= 3;
  return delta;
}

/** Account verification bonuses (max +5). */
export function accountVerificationDelta(input: {
  phoneVerified: boolean;
  paymentVerified: boolean;
}): number {
  let delta = 0;
  if (input.phoneVerified) delta += 2;
  if (input.paymentVerified) delta += 3;
  return delta;
}

export function verificationScore(input: {
  phoneVerified: boolean;
  paymentVerified: boolean;
  isVerified: boolean;
}): number {
  const bonus = accountVerificationDelta(input);
  const base = 60 + bonus * 8;
  const adminBoost = input.isVerified ? 5 : 0;
  return clampTrustScore(base + adminBoost);
}

/** Apply per-event and daily caps to a raw delta. */
export function applyTrustDeltaCaps(input: {
  currentScore: number;
  rawDelta: number;
  dailyDeltaUsed: number;
}): { newScore: number; appliedDelta: number } {
  const remaining = Math.max(0, MAX_DAILY_TRUST_DELTA - input.dailyDeltaUsed);
  const eventCapped =
    input.rawDelta > 0
      ? Math.min(input.rawDelta, MAX_EVENT_TRUST_DELTA)
      : Math.max(input.rawDelta, -MAX_EVENT_TRUST_DELTA);

  const appliedDelta =
    eventCapped >= 0
      ? Math.min(eventCapped, remaining)
      : Math.max(eventCapped, -remaining);

  const newScore = clampTrustScore(input.currentScore + appliedDelta);
  return { newScore, appliedDelta: newScore - input.currentScore };
}
