import type { Prisma } from "@prisma/client";

export type FinancialOperationType =
  | "WALLET_TOP_UP"
  | "WALLET_CHECKOUT"
  | "PROMOTION_PAYMENT"
  | "SELLER_HOLD"
  | "SELLER_RELEASE"
  | "PAYOUT_RESERVE"
  | "PAYOUT_COMPLETE"
  | "PAYOUT_REJECT"
  | "REFUND"
  | "STRIPE_ORDER_PAY";

export type FinancialEnginePhase =
  | "validate"
  | "lock"
  | "execute"
  | "verify"
  | "commit"
  | "audit";

export type FinancialEngineContext = {
  operationType: FinancialOperationType;
  idempotencyKey: string;
  userId?: string;
  sellerId?: string;
  orderId?: string;
  referenceType?: string;
  referenceId?: string;
  amountRub?: number;
  metadata?: Record<string, unknown>;
};

export type Tx = Prisma.TransactionClient;

export type FinancialEngineHandlers<T> = {
  validate?: () => void | Promise<void>;
  lock?: (tx: Tx) => Promise<void>;
  execute: (tx: Tx) => Promise<T>;
  verify?: (tx: Tx, value: T) => Promise<void>;
};

export type FinancialEngineSuccess<T> = {
  ok: true;
  value: T;
  duplicate?: boolean;
  auditIds: string[];
};

export type FinancialEngineFailure = {
  ok: false;
  error: string;
  code?: string;
  incidentId?: string;
  auditIds: string[];
};

export type FinancialEngineResult<T> =
  | FinancialEngineSuccess<T>
  | FinancialEngineFailure;

export class FinancialVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialVerificationError";
  }
}
