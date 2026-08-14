-- EPIC-FINANCE-001: marketplace transaction & trust layer foundation

CREATE TYPE "FinanceTransactionStatus" AS ENUM (
  'PENDING',
  'PAID',
  'HELD',
  'RELEASED',
  'REFUNDED',
  'DISPUTED'
);

CREATE TYPE "DisputeStatus" AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_BUYER',
  'RESOLVED_SELLER'
);

CREATE TABLE "finance_transactions" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "grossAmount" DECIMAL(12,2) NOT NULL,
  "commissionAmount" DECIMAL(12,2) NOT NULL,
  "sellerAmount" DECIMAL(12,2) NOT NULL,
  "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commission_rules" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "percentage" DECIMAL(5,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "seller_balances" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "pendingAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "availableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "seller_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "disputes" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "openedBy" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "finance_transactions_orderId_key" ON "finance_transactions"("orderId");
CREATE INDEX "finance_transactions_buyerId_idx" ON "finance_transactions"("buyerId");
CREATE INDEX "finance_transactions_sellerId_idx" ON "finance_transactions"("sellerId");
CREATE INDEX "finance_transactions_status_idx" ON "finance_transactions"("status");
CREATE INDEX "finance_transactions_createdAt_idx" ON "finance_transactions"("createdAt");

CREATE UNIQUE INDEX "commission_rules_categoryId_key" ON "commission_rules"("categoryId");
CREATE INDEX "commission_rules_active_idx" ON "commission_rules"("active");

CREATE UNIQUE INDEX "seller_balances_sellerId_key" ON "seller_balances"("sellerId");

CREATE INDEX "disputes_orderId_idx" ON "disputes"("orderId");
CREATE INDEX "disputes_openedBy_idx" ON "disputes"("openedBy");
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "seller_balances" ADD CONSTRAINT "seller_balances_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "disputes" ADD CONSTRAINT "disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_openedBy_fkey" FOREIGN KEY ("openedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
