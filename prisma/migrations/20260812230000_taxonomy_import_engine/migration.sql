-- Taxonomy Import Engine — additive tables only (EPIC-A-005)
CREATE TABLE IF NOT EXISTS "taxonomy_import_batches" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statistics" JSONB,
    "report" JSONB,
    "meta" JSONB,
    "createdBy" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "taxonomy_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "taxonomy_import_batches_status_idx" ON "taxonomy_import_batches"("status");
CREATE INDEX IF NOT EXISTS "taxonomy_import_batches_source_idx" ON "taxonomy_import_batches"("source");
CREATE INDEX IF NOT EXISTS "taxonomy_import_batches_hash_idx" ON "taxonomy_import_batches"("hash");
CREATE INDEX IF NOT EXISTS "taxonomy_import_batches_createdAt_idx" ON "taxonomy_import_batches"("createdAt");

CREATE TABLE IF NOT EXISTS "taxonomy_import_items" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "externalId" TEXT,
    "entityType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "taxonomy_import_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "taxonomy_import_items_batchId_idx" ON "taxonomy_import_items"("batchId");
CREATE INDEX IF NOT EXISTS "taxonomy_import_items_status_idx" ON "taxonomy_import_items"("status");
CREATE INDEX IF NOT EXISTS "taxonomy_import_items_entityType_action_idx" ON "taxonomy_import_items"("entityType", "action");
CREATE INDEX IF NOT EXISTS "taxonomy_import_items_externalId_idx" ON "taxonomy_import_items"("externalId");

DO $$ BEGIN
  ALTER TABLE "taxonomy_import_items" ADD CONSTRAINT "taxonomy_import_items_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "taxonomy_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
