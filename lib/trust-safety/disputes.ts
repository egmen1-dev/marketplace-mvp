import type { DisputeReason, DisputeStatus } from "@prisma/client";

export const DISPUTE_REASONS = [
  "ITEM_NOT_MATCH",
  "DAMAGED",
  "NOT_RECEIVED",
  "WRONG_ITEM",
] as const satisfies ReadonlyArray<DisputeReason>;

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  ITEM_NOT_MATCH: "Товар не соответствует описанию",
  DAMAGED: "Товар повреждён",
  NOT_RECEIVED: "Товар не получен",
  WRONG_ITEM: "Прислали не тот товар",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "Открыт",
  SELLER_RESPONSE: "Ответ продавца",
  UNDER_REVIEW: "На проверке",
  RESOLVED_BUYER: "Решено в пользу покупателя",
  RESOLVED_SELLER: "Решено в пользу продавца",
};

export const OPEN_DISPUTE_STATUSES: DisputeStatus[] = [
  "OPEN",
  "SELLER_RESPONSE",
  "UNDER_REVIEW",
];

export function isOpenDisputeStatus(status: DisputeStatus): boolean {
  return OPEN_DISPUTE_STATUSES.includes(status);
}

export function canTransitionDispute(
  from: DisputeStatus,
  to: DisputeStatus,
): boolean {
  const allowed: Record<DisputeStatus, DisputeStatus[]> = {
    OPEN: ["SELLER_RESPONSE", "UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER"],
    SELLER_RESPONSE: ["UNDER_REVIEW", "RESOLVED_BUYER", "RESOLVED_SELLER"],
    UNDER_REVIEW: ["RESOLVED_BUYER", "RESOLVED_SELLER"],
    RESOLVED_BUYER: [],
    RESOLVED_SELLER: [],
  };
  return allowed[from].includes(to);
}
