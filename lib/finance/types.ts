import type {
  DisputeReason,
  DisputeStatus,
  FinanceTransactionStatus,
} from "@prisma/client";

export type CommissionBreakdown = {
  grossAmount: number;
  commissionAmount: number;
  sellerAmount: number;
  commissionPercent: number;
};

export type FinanceTransactionDto = {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  grossAmount: number;
  commissionAmount: number;
  sellerAmount: number;
  status: FinanceTransactionStatus;
  createdAt: string;
  updatedAt: string;
};

export type SellerBalanceDto = {
  sellerId: string;
  pendingAmount: number;
  availableAmount: number;
  paidAmount: number;
  updatedAt: string;
};

export type AdminFinanceRow = {
  transactionId: string;
  orderId: string;
  orderNumber: string;
  sellerName: string;
  grossAmount: number;
  commissionAmount: number;
  sellerAmount: number;
  status: FinanceTransactionStatus;
  createdAt: string;
};

export type AdminFinanceDashboard = {
  turnover: number;
  commissionTotal: number;
  pendingCount: number;
  disputeCount: number;
  rows: AdminFinanceRow[];
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
};
