-- EPIC 189.1: Policy V2 snapshot, image/OCR cache, async evaluation jobs

ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "policyV2Snapshot" JSONB;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "evaluationCompleteness" JSONB;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "imageEvaluationSummary" JSONB;

CREATE TABLE IF NOT EXISTS "moderation_image_evaluation_cache" (
    "id" TEXT NOT NULL,
    "imageContentHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "policyEngineVersion" TEXT,
    "resultJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_image_evaluation_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "moderation_image_evaluation_cache_imageContentHash_provider_providerVersion_kind_key"
ON "moderation_image_evaluation_cache"("imageContentHash", "provider", "providerVersion", "kind");

CREATE INDEX IF NOT EXISTS "moderation_image_evaluation_cache_imageContentHash_idx"
ON "moderation_image_evaluation_cache"("imageContentHash");

CREATE TABLE IF NOT EXISTS "moderation_evaluation_jobs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contentVersionHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_evaluation_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_evaluation_jobs_productId_idx" ON "moderation_evaluation_jobs"("productId");
CREATE INDEX IF NOT EXISTS "moderation_evaluation_jobs_status_idx" ON "moderation_evaluation_jobs"("status");
CREATE INDEX IF NOT EXISTS "moderation_evaluation_jobs_contentVersionHash_idx" ON "moderation_evaluation_jobs"("contentVersionHash");
