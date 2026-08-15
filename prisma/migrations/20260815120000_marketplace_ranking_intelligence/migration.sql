-- MARKETPLACE-RANKING-INTELLIGENCE-001 — advisory ranking layer (does not alter catalog sort)

CREATE TYPE "RankingEligibilityStatus" AS ENUM ('ELIGIBLE', 'NOT_ELIGIBLE');
CREATE TYPE "RankingHistoryEventType" AS ENUM (
  'RECALCULATED',
  'CONTENT_UPDATED',
  'REVIEW_APPROVED',
  'TRUST_CHANGED',
  'WEIGHT_VERSION_CHANGED',
  'QUALITY_GATE_FAILED',
  'SIMULATION',
  'MANUAL'
);
CREATE TYPE "RankingExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TABLE "ranking_algorithm_versions" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ranking_algorithm_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ranking_algorithm_versions_version_key" ON "ranking_algorithm_versions"("version");

CREATE TABLE "ranking_weights" (
  "id" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "factorKey" TEXT NOT NULL,
  "groupKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "weightPercent" INTEGER NOT NULL,
  CONSTRAINT "ranking_weights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ranking_weights_versionId_factorKey_key" ON "ranking_weights"("versionId", "factorKey");
CREATE INDEX "ranking_weights_versionId_idx" ON "ranking_weights"("versionId");

CREATE TABLE "product_ranking_snapshots" (
  "productId" TEXT NOT NULL,
  "overallScore" INTEGER NOT NULL,
  "productScore" INTEGER NOT NULL,
  "sellerScore" INTEGER NOT NULL,
  "behaviourScore" INTEGER NOT NULL,
  "commercialScore" INTEGER NOT NULL,
  "estimatedPosition" INTEGER,
  "eligibility" "RankingEligibilityStatus" NOT NULL,
  "topBlockedReason" TEXT,
  "algorithmVersion" TEXT NOT NULL,
  "versionId" TEXT,
  "computedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_ranking_snapshots_pkey" PRIMARY KEY ("productId")
);

CREATE INDEX "product_ranking_snapshots_overallScore_idx" ON "product_ranking_snapshots"("overallScore");
CREATE INDEX "product_ranking_snapshots_eligibility_idx" ON "product_ranking_snapshots"("eligibility");
CREATE INDEX "product_ranking_snapshots_algorithmVersion_idx" ON "product_ranking_snapshots"("algorithmVersion");

CREATE TABLE "product_ranking_history" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "oldScore" INTEGER NOT NULL,
  "newScore" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "algorithmVersion" TEXT NOT NULL,
  "eventType" "RankingHistoryEventType" NOT NULL,
  "versionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_ranking_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_ranking_history_productId_createdAt_idx" ON "product_ranking_history"("productId", "createdAt");

CREATE TABLE "ranking_experiments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "datasetSize" INTEGER NOT NULL,
  "changedFactor" TEXT NOT NULL,
  "status" "RankingExperimentStatus" NOT NULL DEFAULT 'DRAFT',
  "versionId" TEXT,
  "beforeMetrics" JSONB,
  "afterMetrics" JSONB,
  "rankingImpact" TEXT,
  "confidence" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ranking_experiments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ranking_experiments_status_createdAt_idx" ON "ranking_experiments"("status", "createdAt");

CREATE TABLE "ranking_influence_snapshots" (
  "id" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "influences" JSONB NOT NULL,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ranking_influence_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ranking_influence_snapshots_versionId_computedAt_idx" ON "ranking_influence_snapshots"("versionId", "computedAt");

ALTER TABLE "ranking_weights"
  ADD CONSTRAINT "ranking_weights_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ranking_algorithm_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_ranking_snapshots"
  ADD CONSTRAINT "product_ranking_snapshots_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_ranking_snapshots"
  ADD CONSTRAINT "product_ranking_snapshots_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ranking_algorithm_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_ranking_history"
  ADD CONSTRAINT "product_ranking_history_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_ranking_history"
  ADD CONSTRAINT "product_ranking_history_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ranking_algorithm_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ranking_experiments"
  ADD CONSTRAINT "ranking_experiments_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ranking_algorithm_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ranking_influence_snapshots"
  ADD CONSTRAINT "ranking_influence_snapshots_versionId_fkey"
  FOREIGN KEY ("versionId") REFERENCES "ranking_algorithm_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default algorithm v1 + weights
INSERT INTO "ranking_algorithm_versions" ("id", "version", "label", "description", "isActive")
VALUES ('rank_v1_default', 'v1', 'Ranking V1', 'Baseline ranking intelligence weights', true);

INSERT INTO "ranking_weights" ("id", "versionId", "factorKey", "groupKey", "label", "weightPercent") VALUES
  ('rw_v1_photos', 'rank_v1_default', 'photos', 'product', 'Фото', 15),
  ('rw_v1_description', 'rank_v1_default', 'description', 'product', 'Описание', 8),
  ('rw_v1_seo', 'rank_v1_default', 'seo', 'product', 'SEO', 10),
  ('rw_v1_category', 'rank_v1_default', 'category', 'product', 'Категория', 7),
  ('rw_v1_inventory', 'rank_v1_default', 'inventory', 'product', 'Наличие', 5),
  ('rw_v1_trust', 'rank_v1_default', 'trust', 'seller', 'Доверие', 12),
  ('rw_v1_reviews', 'rank_v1_default', 'reviews', 'seller', 'Отзывы', 8),
  ('rw_v1_shipping', 'rank_v1_default', 'shipping', 'seller', 'Скорость отправки', 5),
  ('rw_v1_ctr', 'rank_v1_default', 'ctr', 'behaviour', 'CTR', 18),
  ('rw_v1_conversion', 'rank_v1_default', 'conversion', 'behaviour', 'Конверсия', 7),
  ('rw_v1_price', 'rank_v1_default', 'price', 'commercial', 'Цена', 5);
