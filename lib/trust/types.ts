import type {
  BuyerOrderConfirmationStatus,
  DisputeReason,
  DisputeStatus,
  OrderStatus,
} from "@prisma/client";

export type BuyerOrderConfirmationDto = {
  id: string;
  orderId: string;
  buyerId: string;
  status: BuyerOrderConfirmationStatus;
  confirmedAt: string | null;
  createdAt: string;
};

export type DisputeDto = {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  openedBy: string;
  reason: DisputeReason;
  description: string | null;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderTrustContext = {
  orderId: string;
  orderStatus: OrderStatus;
  protectionEndsAt: string | null;
  confirmation: BuyerOrderConfirmationDto | null;
  activeDispute: DisputeDto | null;
  canConfirm: boolean;
  canReportIssue: boolean;
};

export type AdminDisputeRow = {
  id: string;
  orderId: string;
  orderNumber: string;
  buyerEmail: string;
  sellerName: string;
  productName: string;
  reason: DisputeReason;
  status: DisputeStatus;
  createdAt: string;
};

export type SellerOrderTrustInfo = {
  protectionLabel: string | null;
  disputeStatus: DisputeStatus | null;
  disputeReason: DisputeReason | null;
};

export const DISPUTE_REASON_LABELS: Record<DisputeReason, string> = {
  WRONG_ITEM: "Не тот товар",
  DAMAGED: "Повреждён",
  NOT_AS_DESCRIBED: "Не соответствует описанию",
  NOT_RECEIVED: "Не получен",
};

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: "Открыт",
  UNDER_REVIEW: "На рассмотрении",
  BUYER_WON: "В пользу покупателя",
  SELLER_WON: "В пользу продавца",
  REFUNDED: "Возврат оформлен",
};
