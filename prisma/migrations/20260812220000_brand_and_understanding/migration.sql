-- Brand entity + product model/brand links + AI correction log
CREATE TABLE IF NOT EXISTS "brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "externalSource" TEXT,
    "externalId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brands_slug_key" ON "brands"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "brands_externalSource_externalId_key" ON "brands"("externalSource", "externalId");
CREATE INDEX IF NOT EXISTS "brands_normalizedName_idx" ON "brands"("normalizedName");
CREATE INDEX IF NOT EXISTS "brands_isActive_idx" ON "brands"("isActive");

CREATE TABLE IF NOT EXISTS "product_understanding_corrections" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "suggested" TEXT,
    "corrected" TEXT,
    "title" TEXT,
    "productTypeId" TEXT,
    "sellerId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_understanding_corrections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "product_understanding_corrections_field_idx" ON "product_understanding_corrections"("field");
CREATE INDEX IF NOT EXISTS "product_understanding_corrections_createdAt_idx" ON "product_understanding_corrections"("createdAt");

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "brandId" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "modelName" TEXT;

CREATE INDEX IF NOT EXISTS "products_brandId_idx" ON "products"("brandId");
CREATE INDEX IF NOT EXISTS "products_modelName_idx" ON "products"("modelName");

DO $$ BEGIN
  ALTER TABLE "products" ADD CONSTRAINT "products_brandId_fkey"
    FOREIGN KEY ("brandId") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
