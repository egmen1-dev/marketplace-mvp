-- MARKETPLACE-SOCIAL-GROWTH-001

CREATE TYPE "SocialCollectionKind" AS ENUM ('USER', 'CREATOR');

CREATE TABLE "social_collections" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "kind" "SocialCollectionKind" NOT NULL DEFAULT 'USER',
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "social_collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_collection_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "social_collections_creatorId_slug_key" ON "social_collections"("creatorId", "slug");
CREATE INDEX "social_collections_kind_idx" ON "social_collections"("kind");
CREATE INDEX "social_collections_createdAt_idx" ON "social_collections"("createdAt");

CREATE UNIQUE INDEX "social_collection_items_collectionId_productId_key" ON "social_collection_items"("collectionId", "productId");
CREATE INDEX "social_collection_items_productId_idx" ON "social_collection_items"("productId");

ALTER TABLE "social_collections" ADD CONSTRAINT "social_collections_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_collection_items" ADD CONSTRAINT "social_collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "social_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_collection_items" ADD CONSTRAINT "social_collection_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
