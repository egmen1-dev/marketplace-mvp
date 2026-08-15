-- LOT Wallet foundation — user wallet buckets, ledger, notification prefs

CREATE TYPE "WalletLedgerType" AS ENUM (
  'SELLER_SALE',
  'BUYER_TOP_UP',
  'PRODUCT_PURCHASE',
  'PROMOTION_PURCHASE',
  'INTERNAL_SERVICE_PURCHASE',
  'BONUS_CREDIT',
  'REFUND',
  'PAYOUT_REQUEST',
  'PAYOUT_COMPLETED',
  'PAYOUT_REVERSED'
);

CREATE TYPE "WalletLedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

CREATE TABLE "user_wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "topupSpendableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "bonusSpendableAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_wallets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_wallets_userId_key" ON "user_wallets"("userId");

ALTER TABLE "user_wallets"
  ADD CONSTRAINT "user_wallets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "wallet_ledger_entries" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "WalletLedgerType" NOT NULL,
  "direction" "WalletLedgerDirection" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "spendableDelta" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "withdrawableDelta" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wallet_ledger_entries_idempotencyKey_key"
  ON "wallet_ledger_entries"("idempotencyKey");

CREATE INDEX "wallet_ledger_entries_userId_createdAt_idx"
  ON "wallet_ledger_entries"("userId", "createdAt");

CREATE INDEX "wallet_ledger_entries_type_idx" ON "wallet_ledger_entries"("type");

ALTER TABLE "wallet_ledger_entries"
  ADD CONSTRAINT "wallet_ledger_entries_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_notification_prefs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ordersEnabled" BOOLEAN NOT NULL DEFAULT true,
  "messagesEnabled" BOOLEAN NOT NULL DEFAULT true,
  "deliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "priceDropEnabled" BOOLEAN NOT NULL DEFAULT true,
  "sellerPromoEnabled" BOOLEAN NOT NULL DEFAULT true,
  "growthTipsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lotNewsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_notification_prefs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_notification_prefs_userId_key"
  ON "user_notification_prefs"("userId");

ALTER TABLE "user_notification_prefs"
  ADD CONSTRAINT "user_notification_prefs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
