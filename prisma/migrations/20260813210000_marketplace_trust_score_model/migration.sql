-- MARKETPLACE-TRUST-SCORE-MODEL-001 — transparent seller trust score history

CREATE TYPE "TrustScoreEventType" AS ENUM (
  'ORDER_CREATED',
  'ORDER_SHIPPED',
  'ORDER_DELIVERED',
  'ORDER_CANCELLED',
  'REVIEW_CREATED',
  'PRODUCT_UPDATED',
  'ACCOUNT_VERIFIED',
  'DAILY_RECALC'
);

CREATE TABLE "trust_score_history" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "oldScore" INTEGER NOT NULL,
    "newScore" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "eventType" "TrustScoreEventType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_score_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trust_score_history_sellerId_idx" ON "trust_score_history"("sellerId");
CREATE INDEX "trust_score_history_createdAt_idx" ON "trust_score_history"("createdAt");

ALTER TABLE "trust_score_history" ADD CONSTRAINT "trust_score_history_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "seller_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
