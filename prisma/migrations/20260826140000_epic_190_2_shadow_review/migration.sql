-- EPIC 190.2 — blind human shadow review tables
CREATE TABLE IF NOT EXISTS "policy_shadow_review_batches" (
    "id" TEXT NOT NULL,
    "sampleBatchId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "targetSampleSize" INTEGER NOT NULL DEFAULT 75,
    "policyVersion" TEXT NOT NULL DEFAULT 'LOT_POLICY_V2',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_shadow_review_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "policy_shadow_review_batches_sampleBatchId_key" ON "policy_shadow_review_batches"("sampleBatchId");

CREATE TABLE IF NOT EXISTS "policy_shadow_human_reviews" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contentVersion" INTEGER NOT NULL,
    "contentVersionHash" TEXT,
    "policyVersion" TEXT NOT NULL DEFAULT 'LOT_POLICY_V2',
    "humanDecision" TEXT NOT NULL,
    "humanReason" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "systemDecision" TEXT,
    "systemRecommendation" TEXT,
    "comparisonClass" TEXT,
    "rulesTriggered" JSONB,
    "evidenceSummary" JSONB,
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_shadow_human_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "policy_shadow_human_reviews_batchId_productId_contentVersion_reviewerId_key"
ON "policy_shadow_human_reviews"("batchId", "productId", "contentVersion", "reviewerId");

CREATE INDEX IF NOT EXISTS "policy_shadow_human_reviews_productId_idx" ON "policy_shadow_human_reviews"("productId");
CREATE INDEX IF NOT EXISTS "policy_shadow_human_reviews_batchId_idx" ON "policy_shadow_human_reviews"("batchId");

ALTER TABLE "policy_shadow_human_reviews" DROP CONSTRAINT IF EXISTS "policy_shadow_human_reviews_batchId_fkey";
ALTER TABLE "policy_shadow_human_reviews" ADD CONSTRAINT "policy_shadow_human_reviews_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "policy_shadow_review_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
