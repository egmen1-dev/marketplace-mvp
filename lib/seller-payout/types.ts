import type {
  PayoutRequestStatus,
  PayoutTransactionStatus,
  SellerPaymentMethodType,
} from "@prisma/client";

export const PAYOUT_ENTITY_TYPE = "PAYOUT_REQUEST";
export const PAYOUT_METHOD_ENTITY_TYPE = "SELLER_PAYMENT_METHOD";

export const MIN_PAYOUT_AMOUNT = 1000;

export type SellerPaymentMethodDto = {
  id: string;
  sellerId: string;
  type: SellerPaymentMethodType;
  label: string;
  detailsReference: string;
  verified: boolean;
  createdAt: string;
};

export type PayoutRequestDto = {
  id: string;
  displayNumber: string;
  sellerId: string;
  amount: number;
  status: PayoutRequestStatus;
  statusLabel: string;
  paymentMethodId: string;
  paymentMethodLabel: string;
  paymentMethodReference: string;
  requestedAt: string;
  approvedAt: string | null;
  processingAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  adminNote: string | null;
};

export type PayoutTransactionDto = {
  id: string;
  payoutRequestId: string;
  sellerId: string;
  amount: number;
  status: PayoutTransactionStatus;
  externalReference: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type SellerPayoutDashboard = {
  enabled: boolean;
  balance: {
    pendingAmount: number;
    availableAmount: number;
    paidAmount: number;
    reservedForPayoutAmount: number;
  };
  methods: SellerPaymentMethodDto[];
  requests: PayoutRequestDto[];
  history: PayoutRequestDto[];
};

export type AdminPayoutDashboard = {
  enabled: boolean;
  pendingCount: number;
  totalObligations: number;
  activeCount: number;
  paidToday: number;
  queue: AdminPayoutQueueRow[];
};

export type AdminPayoutQueueRow = {
  requestId: string;
  displayNumber: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  requestedAt: string;
  status: PayoutRequestStatus;
  statusLabel: string;
  paymentMethodLabel: string;
  paymentMethodReference: string;
};

export type AdminPayoutRequestDetail = {
  request: PayoutRequestDto;
  sellerName: string;
  availableBalance: number;
  payoutHistory: PayoutRequestDto[];
};

export type PayoutNotification = {
  id: string;
  type:
    | "PAYOUT_REQUEST_CREATED"
    | "PAYOUT_UNDER_REVIEW"
    | "PAYOUT_APPROVED"
    | "PAYOUT_PROCESSING"
    | "PAYOUT_COMPLETED"
    | "PAYOUT_REJECTED";
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read: boolean;
};

export function payoutDisplayNumber(id: string): string {
  return id.slice(-5).toUpperCase();
}

export function payoutStatusLabel(status: PayoutRequestStatus): string {
  switch (status) {
    case "REQUESTED":
      return "Заявка создана";
    case "UNDER_REVIEW":
      return "На проверке";
    case "APPROVED":
      return "Одобрено";
    case "PROCESSING":
      return "В обработке";
    case "COMPLETED":
      return "Выплачено";
    case "REJECTED":
      return "Отклонено";
    case "CANCELLED":
      return "Отменено";
    default:
      return status;
  }
}

export function paymentMethodTypeLabel(type: SellerPaymentMethodType): string {
  switch (type) {
    case "CARD":
      return "Банковская карта";
    case "BANK_ACCOUNT":
      return "Расчётный счёт";
    default:
      return type;
  }
}
