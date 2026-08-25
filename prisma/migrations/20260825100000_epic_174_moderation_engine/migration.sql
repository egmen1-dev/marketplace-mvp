-- EPIC 174: Moderation & Trust Engine v1
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "contentVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "reviewStartedAt" TIMESTAMP(3);
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "needsChangesAt" TIMESTAMP(3);
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "policyVersion" TEXT;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "reviewMode" TEXT;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "stage" TEXT;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "reasonCodes" JSONB;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "rulesTriggered" JSONB;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "systemRecommendation" TEXT;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "contentVersionAtSubmit" INTEGER;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "contentVersionHash" TEXT;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "moderatedContentVersion" INTEGER;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "moderatedContentVersionHash" TEXT;
ALTER TABLE "product_moderations" ADD COLUMN IF NOT EXISTS "decisionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "product_moderations_submittedAt_idx" ON "product_moderations"("submittedAt");
CREATE INDEX IF NOT EXISTS "product_moderations_riskScore_idx" ON "product_moderations"("riskScore");

CREATE TABLE IF NOT EXISTS "product_moderation_audit_events" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "moderationId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "previousStatus" "ModerationStatus",
    "newStatus" "ModerationStatus" NOT NULL,
    "decision" TEXT NOT NULL,
    "reasonCodes" JSONB NOT NULL DEFAULT '[]',
    "rulesTriggered" JSONB NOT NULL DEFAULT '[]',
    "riskScore" INTEGER,
    "policyVersion" TEXT,
    "reviewerType" TEXT NOT NULL,
    "reviewerId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_moderation_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_moderation_audit_events_productId_idx" ON "product_moderation_audit_events"("productId");
CREATE INDEX IF NOT EXISTS "product_moderation_audit_events_moderationId_idx" ON "product_moderation_audit_events"("moderationId");
CREATE INDEX IF NOT EXISTS "product_moderation_audit_events_sellerId_idx" ON "product_moderation_audit_events"("sellerId");
CREATE INDEX IF NOT EXISTS "product_moderation_audit_events_createdAt_idx" ON "product_moderation_audit_events"("createdAt");

ALTER TABLE "product_moderation_audit_events" DROP CONSTRAINT IF EXISTS "product_moderation_audit_events_moderationId_fkey";
ALTER TABLE "product_moderation_audit_events" ADD CONSTRAINT "product_moderation_audit_events_moderationId_fkey" FOREIGN KEY ("moderationId") REFERENCES "product_moderations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
