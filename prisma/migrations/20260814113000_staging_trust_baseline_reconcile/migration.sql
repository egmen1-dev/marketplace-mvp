-- STAGING-ROLLOUT-FIX-001: idempotent reconcile for staging DB drift
-- Bridges payment_finance_ledger + agent reviews schema → marketplace trust baseline.
-- Safe to run once on staging; uses IF NOT EXISTS / guarded ALTERs.

-- ─── Finance: extend ledger rows for EPIC-FINANCE-001 shape ─────────────────
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "buyerId" TEXT;

UPDATE "finance_transactions" ft
SET "buyerId" = o."userId"
FROM "orders" o
WHERE ft."orderId" = o."id" AND ft."buyerId" IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'finance_transactions_buyerId_fkey'
  ) THEN
    ALTER TABLE "finance_transactions"
      ADD CONSTRAINT "finance_transactions_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "finance_transactions_buyerId_idx" ON "finance_transactions"("buyerId");

-- Extend finance status enum for marketplace flow (ignore if exists)
DO $$ BEGIN
  ALTER TYPE "FinanceTransactionStatus" ADD VALUE IF NOT EXISTS 'PAID';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "FinanceTransactionStatus" ADD VALUE IF NOT EXISTS 'HELD';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "FinanceTransactionStatus" ADD VALUE IF NOT EXISTS 'RELEASED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "FinanceTransactionStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "FinanceTransactionStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- seller_balances payout columns
ALTER TABLE "seller_balances" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;
ALTER TABLE "seller_balances" ADD COLUMN IF NOT EXISTS "reservedForPayoutAmount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- ─── Disputes (marketplace finance shape) ───────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "disputes" (
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

CREATE INDEX IF NOT EXISTS "disputes_orderId_idx" ON "disputes"("orderId");
CREATE INDEX IF NOT EXISTS "disputes_openedBy_idx" ON "disputes"("openedBy");
CREATE INDEX IF NOT EXISTS "disputes_status_idx" ON "disputes"("status");

-- ─── Reviews: extend agent schema for trust loop ────────────────────────────
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "pros" TEXT;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "cons" TEXT;

DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "review_photos" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "review_photos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "review_photos_reviewId_idx" ON "review_photos"("reviewId");

-- ─── Trust loop aggregates ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ModerationStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_FIX');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "ModerationItemType" AS ENUM ('PRODUCT', 'REVIEW', 'REPORT', 'CONTENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "product_ratings" (
    "productId" TEXT NOT NULL,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "rating1" INTEGER NOT NULL DEFAULT 0,
    "rating2" INTEGER NOT NULL DEFAULT 0,
    "rating3" INTEGER NOT NULL DEFAULT 0,
    "rating4" INTEGER NOT NULL DEFAULT 0,
    "rating5" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_ratings_pkey" PRIMARY KEY ("productId")
);

CREATE TABLE IF NOT EXISTS "seller_reputations" (
    "sellerId" TEXT NOT NULL,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "cancellationRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "trustScore" INTEGER NOT NULL DEFAULT 0,
    "positiveSentiment" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seller_reputations_pkey" PRIMARY KEY ("sellerId")
);

CREATE TABLE IF NOT EXISTS "product_moderations" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "qualityScore" INTEGER,
    "issues" JSONB,
    "prohibitedHit" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_moderations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "product_moderations_productId_key" ON "product_moderations"("productId");

CREATE TABLE IF NOT EXISTS "moderation_queue_items" (
    "id" TEXT NOT NULL,
    "type" "ModerationItemType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "sellerId" TEXT,
    "status" "ModerationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "riskLevel" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "moderation_queue_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "moderation_queue_items_type_status_idx" ON "moderation_queue_items"("type", "status");

-- ─── Trust score history ─────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "TrustScoreEventType" AS ENUM (
    'ORDER_CREATED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_CANCELLED',
    'REVIEW_CREATED', 'PRODUCT_UPDATED', 'ACCOUNT_VERIFIED', 'DAILY_RECALC'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "trust_score_history" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "oldScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "eventType" "TrustScoreEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trust_score_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "trust_score_history_sellerId_idx" ON "trust_score_history"("sellerId");
CREATE INDEX IF NOT EXISTS "trust_score_history_createdAt_idx" ON "trust_score_history"("createdAt");

-- ─── Seller first entry ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "seller_experience_progress" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "currentStep" TEXT,
    "dismissedSteps" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seller_experience_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "seller_experience_progress_sellerId_key" ON "seller_experience_progress"("sellerId");

-- ─── Commission rules + payout (seller_payout epic) ───────────────────────────
CREATE TABLE IF NOT EXISTS "commission_rules" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "percentage" DECIMAL(5,2) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "commission_rules_categoryId_key" ON "commission_rules"("categoryId");

DO $$ BEGIN
  CREATE TYPE "PayoutRequestStatus" AS ENUM ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "SellerPaymentMethodType" AS ENUM ('CARD', 'BANK_ACCOUNT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE "PayoutTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "seller_payment_methods" (
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

CREATE TABLE IF NOT EXISTS "payout_requests" (
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

CREATE TABLE IF NOT EXISTS "payout_transactions" (
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

-- ─── Social growth ───────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "SocialCollectionKind" AS ENUM ('USER', 'CREATOR');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "social_collections" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "kind" "SocialCollectionKind" NOT NULL DEFAULT 'USER',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "social_collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "social_collections_creatorId_slug_key" ON "social_collections"("creatorId", "slug");

CREATE TABLE IF NOT EXISTS "social_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_collection_items_pkey" PRIMARY KEY ("id")
);

-- ─── Delivery returns ────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ReturnRequestStatus" AS ENUM ('CREATED', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "return_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id")
);
