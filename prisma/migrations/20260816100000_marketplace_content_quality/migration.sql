-- MARKETPLACE-CONTENT-QUALITY-INTELLIGENCE-001
CREATE TABLE "product_quality_snapshots" (
    "productId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "factorScores" JSONB NOT NULL,
    "photoEvaluations" JSONB,
    "blockers" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "recommendations" JSONB NOT NULL,
    "failedGates" JSONB NOT NULL,
    "topEligibility" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "qualityModelVersion" TEXT NOT NULL,
    "criticVersion" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "contentHash" TEXT,
    "evaluation" JSONB NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quality_snapshots_pkey" PRIMARY KEY ("productId")
);

CREATE TABLE "product_quality_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "factorScores" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "qualityModelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_quality_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_quality_snapshots_overallScore_idx" ON "product_quality_snapshots"("overallScore");
CREATE INDEX "product_quality_snapshots_topEligibility_idx" ON "product_quality_snapshots"("topEligibility");
CREATE INDEX "product_quality_snapshots_provider_idx" ON "product_quality_snapshots"("provider");
CREATE INDEX "product_quality_history_productId_createdAt_idx" ON "product_quality_history"("productId", "createdAt");

ALTER TABLE "product_quality_snapshots" ADD CONSTRAINT "product_quality_snapshots_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_quality_history" ADD CONSTRAINT "product_quality_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
