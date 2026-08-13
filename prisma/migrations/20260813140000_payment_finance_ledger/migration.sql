-- PAYMENT-READY-001: Stripe webhook idempotency + finance ledger + seller balance

CREATE TYPE "StripeWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');
CREATE TYPE "FinanceTransactionType" AS ENUM ('SALE', 'RELEASE', 'REFUND', 'ADJUSTMENT');
CREATE TYPE "FinanceTransactionStatus" AS ENUM ('PENDING', 'AVAILABLE', 'REVERSED');

CREATE TABLE "stripe_webhook_events" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "StripeWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "orderId" TEXT,
    "error" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stripe_webhook_events_stripeEventId_key" ON "stripe_webhook_events"("stripeEventId");
CREATE INDEX "stripe_webhook_events_status_idx" ON "stripe_webhook_events"("status");
CREATE INDEX "stripe_webhook_events_type_idx" ON "stripe_webhook_events"("type");
CREATE INDEX "stripe_webhook_events_receivedAt_idx" ON "stripe_webhook_events"("receivedAt");

CREATE TABLE "finance_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "FinanceTransactionType" NOT NULL,
    "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "sellerAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "commissionBps" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finance_transactions_orderId_sellerId_type_key" ON "finance_transactions"("orderId", "sellerId", "type");
CREATE INDEX "finance_transactions_sellerId_idx" ON "finance_transactions"("sellerId");
CREATE INDEX "finance_transactions_orderId_idx" ON "finance_transactions"("orderId");
CREATE INDEX "finance_transactions_type_idx" ON "finance_transactions"("type");
CREATE INDEX "finance_transactions_status_idx" ON "finance_transactions"("status");
CREATE INDEX "finance_transactions_createdAt_idx" ON "finance_transactions"("createdAt");

ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "seller_balances" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "pendingAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "availableAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_balances_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "seller_balances_sellerId_key" ON "seller_balances"("sellerId");

ALTER TABLE "seller_balances" ADD CONSTRAINT "seller_balances_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
