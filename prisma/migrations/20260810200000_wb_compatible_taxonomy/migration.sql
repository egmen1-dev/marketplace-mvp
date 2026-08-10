-- CreateEnum
CREATE TYPE "CharacteristicValueType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'SELECT', 'MULTISELECT', 'COLOR', 'SIZE');

-- AlterTable Category
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "path" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "externalSource" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "externalId" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "externalName" TEXT;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "locallyEdited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "sourceUpdatedAt" TIMESTAMP(3);
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "categories_externalSource_externalId_key" ON "categories"("externalSource", "externalId");
CREATE INDEX IF NOT EXISTS "categories_path_idx" ON "categories"("path");
CREATE INDEX IF NOT EXISTS "categories_name_idx" ON "categories"("name");
CREATE INDEX IF NOT EXISTS "categories_externalSource_externalId_idx" ON "categories"("externalSource", "externalId");

-- CreateTable ProductType
CREATE TABLE IF NOT EXISTS "product_types" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lotName" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "externalSource" TEXT,
    "externalId" TEXT,
    "externalName" TEXT,
    "locallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "sourceUpdatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_types_slug_key" ON "product_types"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "product_types_externalSource_externalId_key" ON "product_types"("externalSource", "externalId");
CREATE INDEX IF NOT EXISTS "product_types_categoryId_idx" ON "product_types"("categoryId");
CREATE INDEX IF NOT EXISTS "product_types_slug_idx" ON "product_types"("slug");
CREATE INDEX IF NOT EXISTS "product_types_isActive_idx" ON "product_types"("isActive");
CREATE INDEX IF NOT EXISTS "product_types_name_idx" ON "product_types"("name");
CREATE INDEX IF NOT EXISTS "product_types_externalSource_externalId_idx" ON "product_types"("externalSource", "externalId");

ALTER TABLE "product_types" ADD CONSTRAINT "product_types_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable CategoryAlias
CREATE TABLE IF NOT EXISTS "category_aliases" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "category_aliases_categoryId_normalized_key" ON "category_aliases"("categoryId", "normalized");
CREATE INDEX IF NOT EXISTS "category_aliases_normalized_idx" ON "category_aliases"("normalized");

ALTER TABLE "category_aliases" ADD CONSTRAINT "category_aliases_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ProductTypeAlias
CREATE TABLE IF NOT EXISTS "product_type_aliases" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_type_aliases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_type_aliases_productTypeId_normalized_key" ON "product_type_aliases"("productTypeId", "normalized");
CREATE INDEX IF NOT EXISTS "product_type_aliases_normalized_idx" ON "product_type_aliases"("normalized");

ALTER TABLE "product_type_aliases" ADD CONSTRAINT "product_type_aliases_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ProductCharacteristicDefinition
CREATE TABLE IF NOT EXISTS "product_characteristic_definitions" (
    "id" TEXT NOT NULL,
    "productTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "CharacteristicValueType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "filterable" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "externalSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_characteristic_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_characteristic_definitions_productTypeId_slug_key" ON "product_characteristic_definitions"("productTypeId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "product_characteristic_definitions_externalSource_externalId_key" ON "product_characteristic_definitions"("externalSource", "externalId");
CREATE INDEX IF NOT EXISTS "product_characteristic_definitions_productTypeId_idx" ON "product_characteristic_definitions"("productTypeId");
CREATE INDEX IF NOT EXISTS "product_characteristic_definitions_slug_idx" ON "product_characteristic_definitions"("slug");
CREATE INDEX IF NOT EXISTS "product_characteristic_definitions_filterable_idx" ON "product_characteristic_definitions"("filterable");

ALTER TABLE "product_characteristic_definitions" ADD CONSTRAINT "product_characteristic_definitions_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ProductCharacteristicValue
CREATE TABLE IF NOT EXISTS "product_characteristic_values" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DECIMAL(18,4),
    "valueBoolean" BOOLEAN,
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_characteristic_values_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_characteristic_values_productId_definitionId_key" ON "product_characteristic_values"("productId", "definitionId");
CREATE INDEX IF NOT EXISTS "product_characteristic_values_productId_idx" ON "product_characteristic_values"("productId");
CREATE INDEX IF NOT EXISTS "product_characteristic_values_definitionId_idx" ON "product_characteristic_values"("definitionId");

ALTER TABLE "product_characteristic_values" ADD CONSTRAINT "product_characteristic_values_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_characteristic_values" ADD CONSTRAINT "product_characteristic_values_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "product_characteristic_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Product
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "productTypeId" TEXT;
CREATE INDEX IF NOT EXISTS "products_productTypeId_idx" ON "products"("productTypeId");
ALTER TABLE "products" ADD CONSTRAINT "products_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
