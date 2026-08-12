-- SEO Growth Engine — controlled pages + facet rules (EPIC-A-006)
CREATE TABLE IF NOT EXISTS "seo_pages" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "path" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT,
    "aiDraft" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "indexable" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seo_pages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seo_pages_path_key" ON "seo_pages"("path");
CREATE INDEX IF NOT EXISTS "seo_pages_entityType_entityId_idx" ON "seo_pages"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "seo_pages_status_indexable_idx" ON "seo_pages"("status", "indexable");
CREATE INDEX IF NOT EXISTS "seo_pages_score_idx" ON "seo_pages"("score");

CREATE TABLE IF NOT EXISTS "seo_facet_rules" (
    "id" TEXT NOT NULL,
    "characteristicSlug" TEXT NOT NULL,
    "productTypeSlug" TEXT,
    "minProductCount" INTEGER NOT NULL DEFAULT 3,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "seo_facet_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "seo_facet_rules_characteristicSlug_productTypeSlug_key"
  ON "seo_facet_rules"("characteristicSlug", "productTypeSlug");
CREATE INDEX IF NOT EXISTS "seo_facet_rules_enabled_idx" ON "seo_facet_rules"("enabled");
