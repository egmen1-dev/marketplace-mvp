-- SELLER-PAYOUT-001 — withdrawal requests and reserved balance

ALTER TABLE "seller_balances" ADD COLUMN "reservedForPayoutAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "SellerPaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT');
CREATE TYPE "PayoutTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

CREATE TABLE "seller_payment_methods" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "SellerPaymentMethodType" NOT NULL,
    "label" TEXT NOT NULL,
    "detailsReference" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PayoutRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "paymentMethodId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "processingAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payout_transactions" (
    "id" TEXT NOT NULL,
    "payoutRequestId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "PayoutTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "externalReference" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payout_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "seller_payment_methods_sellerId_idx" ON "seller_payment_methods"("sellerId");
CREATE INDEX "payout_requests_sellerId_idx" ON "payout_requests"("sellerId");
CREATE INDEX "payout_requests_status_idx" ON "payout_requests"("status");
CREATE INDEX "payout_requests_requestedAt_idx" ON "payout_requests"("requestedAt");
CREATE INDEX "payout_transactions_payoutRequestId_idx" ON "payout_transactions"("payoutRequestId");
CREATE INDEX "payout_transactions_sellerId_idx" ON "payout_transactions"("sellerId");

ALTER TABLE "seller_payment_methods" ADD CONSTRAINT "seller_payment_methods_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "seller_payment_methods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payout_transactions" ADD CONSTRAINT "payout_transactions_payoutRequestId_fkey" FOREIGN KEY ("payoutRequestId") REFERENCES "payout_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payout_transactions" ADD CONSTRAINT "payout_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
