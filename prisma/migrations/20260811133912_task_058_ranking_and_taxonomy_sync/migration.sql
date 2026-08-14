-- CreateEnum
CREATE TYPE "TaxonomySyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "product_ranking_stats" (
    "productId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "completedOrders" INTEGER NOT NULL DEFAULT 0,
    "unitsOrdered" INTEGER NOT NULL DEFAULT 0,
    "unitsBoughtOut" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "conversionRate" DECIMAL(6,5),
    "buyoutRate" DECIMAL(6,5),
    "avgRating" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "organicScore" DECIMAL(6,5),
    "rankingVersion" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_ranking_stats_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "taxonomy_sync_runs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "status" "TaxonomySyncStatus" NOT NULL DEFAULT 'RUNNING',
    "categoriesImported" INTEGER NOT NULL DEFAULT 0,
    "productTypesImported" INTEGER NOT NULL DEFAULT 0,
    "characteristicsImported" INTEGER NOT NULL DEFAULT 0,
    "aliasesImported" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "deactivated" INTEGER NOT NULL DEFAULT 0,
    "errorText" TEXT,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "taxonomy_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_ranking_stats_organicScore_idx" ON "product_ranking_stats"("organicScore");

-- CreateIndex
CREATE INDEX "taxonomy_sync_runs_source_idx" ON "taxonomy_sync_runs"("source");

-- CreateIndex
CREATE INDEX "taxonomy_sync_runs_startedAt_idx" ON "taxonomy_sync_runs"("startedAt");

-- AddForeignKey
ALTER TABLE "product_ranking_stats" ADD CONSTRAINT "product_ranking_stats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "product_characteristic_definitions_externalSource_externalId_ke" RENAME TO "product_characteristic_definitions_externalSource_externalI_key";
